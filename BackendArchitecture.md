# Backend Architecture Specification: AI CITY

**Production-Grade Server Architecture (Node.js + Express.js + TypeScript)**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Hackathon Architecture Decision: "Why This Layout?"
During a 36-hour hackathon, engineering velocity is the primary success driver. Overengineering via layers like the Repository Pattern introduces unnecessary cognitive overhead:
* **The Repository Pattern Antipattern in Hackathons:** Creating Interfaces and Abstract Classes for database access results in duplicate file additions (`IIncidentRepository`, `MongoIncidentRepository`, `MockIncidentRepository`) without providing immediate value.
* **The Controller-Service-Model Solution:**
  * **Controllers:** Expose endpoints, parse incoming HTTP bodies, and execute quick Zod schema validations.
  * **Services:** Orchestrate business rules, calculate duplicate detection checks, and trigger the AI graph runs.
  * **Models:** Provide structured Mongoose schemas and interface directly with MongoDB Atlas.

This clean separation ensures that the Express framework does not bleed into the business logic. If the startup scales to Version 2 and requires PostgreSQL or a decoupled CQRS database pipeline, engineers can wrap the database queries inside a repository layer *without* modifying controllers or routers.

---

## 2. Project Folder Structure
```
backend/
├── src/
│   ├── config/               # Infrastructure clients (MongoDB, Firebase Admin, Cloudinary)
│   ├── controllers/          # HTTP request handlers & body validation matching
│   │   ├── incident.controller.ts
│   │   ├── admin.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/           # Express middleware hooks
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── validate.middleware.ts
│   ├── models/               # Mongoose Schema Definitions
│   │   ├── user.model.ts
│   │   ├── incident.model.ts
│   │   └── aiLog.model.ts
│   ├── routes/               # API route maps
│   │   ├── incident.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   ├── services/             # Core workflows and AI graph orchestrations
│   │   ├── incident.service.ts
│   │   ├── aiBrain.service.ts
│   │   └── duplicate.service.ts
│   ├── utils/                # Loggers, custom exceptions, constants
│   │   ├── logger.ts
│   │   └── exceptions.ts
│   ├── app.ts                # Express application configuration
│   └── server.ts             # Process listener entrypoint
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Core Component Responsibilities & Interfaces

### 3.1. Routes & Controllers Layer
Routes map HTTP pathways and register relevant middlewares. Controllers act as traffic directors, parsing request parameters and forwarding sanitized values to the Service layer.

```typescript
// Example Controller Design Pattern
import { Request, Response, NextFunction } from 'express';
import { IncidentService } from '../services/incident.service';

export class IncidentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Body is already validated by schema validator middleware
      const citizenId = req.user.id; 
      const result = await IncidentService.ingestIncident(req.body, citizenId);
      
      if (result.duplicateFound) {
        res.status(200).json({ success: true, ...result });
        return;
      }
      
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      next(error); // Forward to global error handler
    }
  }
}
```

### 3.2. Service Layer
Services house business workflows. They coordinate transactions and interact with third-party APIs (Cloudinary, Gemini).

```typescript
// Example Incident Service Design Pattern
import { Incident } from '../models/incident.model';
import { DuplicateService } from './duplicate.service';
import { AIBrainService } from './aiBrain.service';

export class IncidentService {
  public static async ingestIncident(payload: any, citizenId: string): Promise<any> {
    // 1. Check for spatial duplicates
    const duplicate = await DuplicateService.checkDuplicate(payload.location, payload.category);
    if (duplicate) {
      await Incident.updateOne({ _id: duplicate._id }, { $inc: { witnessCount: 1 } });
      return { duplicateFound: true, parentIncidentId: duplicate._id };
    }

    // 2. Run the AI CITY Brain graph process
    const aiDecision = await AIBrainService.execute(payload.imageUrl, payload.description);

    // 3. Persist new Incident to DB
    const newIncident = await Incident.create({
      citizenId,
      ...payload,
      category: aiDecision.category,
      severity: aiDecision.severity,
      department: aiDecision.department,
      aiReport: aiDecision,
      status: aiDecision.confidence >= 0.82 ? 'AI_Assigned' : 'Submitted'
    });

    return { duplicateFound: false, data: newIncident };
  }
}
```

---

## 4. Middleware Pipeline Architecture
Request processing follows a strict sequential middleware chain:

```
[ Request In ] ──► [ Rate Limiter ] ──► [ Auth JWT Validator ] ──► [ Zod Body Validator ] ──► [ Route Controller ] ──► [ Error Interceptor ]
```

1. **`rateLimit.middleware.ts`:** Implements `express-rate-limit` using an in-memory sliding window. Submission paths are capped at 5 requests per 10 minutes per IP.
2. **`auth.middleware.ts`:** Decodes the `Authorization: Bearer <token>` header, calls the Firebase Admin SDK `verifyIdToken()`, and maps user context parameters to `req.user`.
3. **`validate.middleware.ts`:** Generic Zod validator that intercepts requests and evaluates the payload against the route's Zod schema. If validation fails, it stops execution and returns HTTP 400 with detailed schema errors.
4. **`error.middleware.ts`:** Catches all thrown exceptions. It logs the stack trace using Winston, formats a clean JSON response (hiding raw stack traces in production), and returns the matching HTTP status code.

---

## 5. Third-Party Integrations

### 5.1. Cloudinary Setup
To minimize server workload, the frontend uploads images directly using unsigned presets. If secondary servers require backend-to-backend uploading, the backend configures `cloudinary.v2` using the standard `CLOUDINARY_URL` string:
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloudinary_api_url: process.env.CLOUDINARY_URL
});

export const uploadBuffer = async (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'aicity_incidents' }, (error, result) => {
      if (error) return reject(error);
      resolve(result!.secure_url);
    }).end(buffer);
  });
};
```

### 5.2. Gemini 2.5 Flash SDK Integration
We utilize the `@google/genai` SDK. To guarantee predictable structured JSON, we enforce schema verification parameters:
```typescript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Enforcing schema directly in model configurations
export const runGeminiClassification = async (prompt: string, imageParts?: any[]) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: imageParts ? [prompt, ...imageParts] : prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
          department: { type: Type.STRING, enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'] },
          confidence: { type: Type.NUMBER },
          why: { type: Type.ARRAY, items: { type: Type.STRING } },
          estimatedResolution: { type: Type.STRING }
        },
        required: ['category', 'severity', 'department', 'confidence', 'why', 'estimatedResolution']
      }
    }
  });
  return JSON.parse(response.text);
};
```

### 5.3. LangGraph Integration
LangGraph provides the orchestration state graph. The state context is passed between stages:
* **State definition:** Coordinates the active incident payload, processed images, severity metrics, and the confidence score.
* **Graph Compilation:** Node functions retrieve and update this state:
  ```typescript
  import { StateGraph } from '@langchain/langgraph';
  
  const graph = new StateGraph({ channels: stateSchema })
    .addNode('visual_node', runVisualNode)
    .addNode('severity_node', runSeverityNode)
    .addNode('department_node', runDepartmentNode)
    .addConditionalEdges('department_node', confidenceRouter)
    .addNode('explain_node', runExplainNode)
    .addEdge('explain_node', END);
  ```

---

## 6. Logging Architecture
AI CITY uses **Winston** for logging, coupled with **Morgan** for HTTP route monitoring.
* **Structured Format:** Log entries print in JSON format in production and simplified colorized format in development.
* **Log Telemetry Keys:** Every log statement includes metadata attributes:
  * `timestamp`
  * `level` (error, warn, info, debug)
  * `context` (e.g., `AIBrainExecution`, `DatabaseQuery`, `AuthMiddleware`)
  * `latencyMs` (for profiling external API connections)

---

## 7. Environment Variables Template (`.env.example`)
Store these keys securely. In production (Render/Vercel), inject them via host environment panels.

```env
# System Configuration
PORT=5000
NODE_ENV=development

# Database Cluster
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/aicity?retryWrites=true&w=majority

# Firebase Admin SDK Credentials (Base64 Encoded JSON string for easy injection)
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJhY2NvdW50X2tleSI6ICJ2YWx1ZSIsIC4uLn0=

# AI & Cognitive Services
GEMINI_API_KEY=AIzaSyA1...
GEMINI_MODEL_NAME=gemini-2.5-flash

# Object CDN
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@cloud_name

# Rate Limiting Parameters
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=100
```
