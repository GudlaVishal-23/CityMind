# Database Design Specification: AI CITY

**Production-Grade MongoDB Atlas Schema Design**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Entity-Relationship (ER) Diagram
The diagram below maps the collection relationships and references used by AI CITY v1.0.

```mermaid
erDiagram
    Users ||--o{ Incidents : "reports"
    Users ||--o{ AdminOverrides : "performs"
    Incidents ||--|| AIDecisions : "triggers"
    Incidents ||--o{ AdminOverrides : "audits"
    Incidents ||--o{ Incidents : "links as duplicate parent-child"
    
    Users {
        ObjectId _id PK
        string firebaseUid UK
        string email
        string role "citizen | admin"
        date createdAt
    }

    Incidents {
        ObjectId _id PK
        ObjectId citizenId FK "references Users"
        string title
        string description
        string imageUrl
        GeoJSONPoint location "2dsphere spatial index"
        string category
        string severity "Low | Medium | High | Critical"
        string department "PWD | ELECTRICITY | WATER_BOARD | SANITATION"
        string status "Submitted | AI_Assigned | In_Progress | Resolved"
        boolean isDuplicate
        ObjectId parentIncidentId FK "references Incidents"
        int witnessCount
        date createdAt
    }

    AIDecisions {
        ObjectId _id PK
        ObjectId incidentId FK "references Incidents"
        int promptTokens
        int completionTokens
        int latencyMs
        string modelName
        string array imageFeatures
        double confidenceScore
        string reasoningReport "Markdown text"
        string array nodePath
        date executedAt
    }

    AdminOverrides {
        ObjectId _id PK
        ObjectId incidentId FK "references Incidents"
        ObjectId adminId FK "references Users"
        string originalField "severity | department"
        string previousValue
        string newValue
        string overrideReason
        date createdAt
    }
```

---

## 2. Collection Schemas & Validations

### 2.1. `Users` Collection
Stores metadata of citizens and administrative operators synced from Firebase Authentication records.
* **Database Indexes:**
  * Unique index on `firebaseUid`.
  * Index on `role` to optimize dashboard filtering.
* **Schema Validation (Mongoose):**
  ```typescript
  import { Schema, model } from 'mongoose';

  const UserSchema = new Schema({
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, match: /.+\@.+\..+/ },
    role: { type: String, enum: ['citizen', 'admin'], default: 'citizen', index: true },
    createdAt: { type: Date, default: Date.now }
  });

  export const User = model('User', UserSchema);
  ```

### 2.2. `Incidents` Collection
Houses incident reports submitted by citizens, tracking duplicates and operational properties.
* **Database Indexes:**
  * Spatial `2dsphere` index on `location`.
  * Compound index `{ department: 1, status: 1 }` for operator list routing.
  * Compound index `{ status: 1, severity: -1 }` for prioritized triage queries.
* **Schema Validation (Mongoose):**
  ```typescript
  const IncidentSchema = new Schema({
    citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, minlength: 10 },
    imageUrl: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    category: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true, index: true },
    department: { type: String, enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'], required: true, index: true },
    status: { type: String, enum: ['Submitted', 'AI_Assigned', 'In_Progress', 'Resolved'], default: 'Submitted', index: true },
    isDuplicate: { type: Boolean, default: false, index: true },
    parentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null, index: true },
    witnessCount: { type: Number, default: 1, min: 1 },
    createdAt: { type: Date, default: Date.now, index: true }
  });

  IncidentSchema.index({ location: '2dsphere' });
  ```

### 2.3. `AIDecisions` Collection
The audit logging store tracking metrics and cognitive reasoning steps of the **AI CITY Brain™**.
* **Database Indexes:**
  * Unique index on `incidentId`.
* **Schema Validation (Mongoose):**
  ```typescript
  const AIDecisionSchema = new Schema({
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, unique: true, index: true },
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    modelName: { type: String, required: true },
    imageFeatures: [{ type: String }],
    confidenceScore: { type: Number, required: true, min: 0.0, max: 1.0 },
    reasoningReport: { type: String, required: true },
    nodePath: [{ type: String }],
    executedAt: { type: Date, default: Date.now }
  });
  ```

### 2.4. `AdminOverrides` Collection
Logs modifications made by human operators to AI decisions.
* **Schema Validation (Mongoose):**
  ```typescript
  const AdminOverrideSchema = new Schema({
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalField: { type: String, enum: ['severity', 'department'], required: true },
    previousValue: { type: String, required: true },
    newValue: { type: String, required: true },
    overrideReason: { type: String, required: true, minlength: 15 },
    createdAt: { type: Date, default: Date.now }
  });
  ```

---

## 3. Sample Documents (JSON Representation)

### 3.1. User Document
```json
{
  "_id": { "$oid": "60a7b1b2f1d2b82e1c9d2a01" },
  "firebaseUid": "zW3uRJx8Kdf92Ksls8Dns93Ksls1",
  "email": "priya.sharma@gmail.com",
  "role": "citizen",
  "createdAt": { "$date": "2026-07-15T14:10:00.000Z" }
}
```

### 3.2. Incident Document (Active, Non-Duplicate)
```json
{
  "_id": { "$oid": "60a7b2c5f1d2b82e1c9d2a05" },
  "citizenId": { "$oid": "60a7b1b2f1d2b82e1c9d2a01" },
  "title": "Burst Water Pipe on Outer Ring Road",
  "description": "A massive volume of water is gushing out from under the pavement, flooding the left lane. It looks like it is eroding the road surface.",
  "imageUrl": "https://res.cloudinary.com/aicity/image/upload/v1721052600/incidents/water_leak_1.jpg",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "category": "WaterBurst",
  "severity": "High",
  "department": "WATER_BOARD",
  "status": "AI_Assigned",
  "isDuplicate": false,
  "parentIncidentId": null,
  "witnessCount": 1,
  "createdAt": { "$date": "2026-07-15T14:15:00.000Z" }
}
```

### 3.3. Incident Document (Linked Duplicate)
```json
{
  "_id": { "$oid": "60a7b2dcf1d2b82e1c9d2a08" },
  "citizenId": { "$oid": "60a7b1bdf1d2b82e1c9d2a02" },
  "title": "Flooded street, water leaking from road",
  "description": "Street is completely flooded due to a ruptured underground pipe near ORR junction.",
  "imageUrl": "https://res.cloudinary.com/aicity/image/upload/v1721052650/incidents/water_leak_duplicate.jpg",
  "location": {
    "type": "Point",
    "coordinates": [77.5948, 12.9715]
  },
  "category": "WaterBurst",
  "severity": "High",
  "department": "WATER_BOARD",
  "status": "Submitted",
  "isDuplicate": true,
  "parentIncidentId": { "$oid": "60a7b2c5f1d2b82e1c9d2a05" },
  "witnessCount": 1,
  "createdAt": { "$date": "2026-07-15T14:18:00.000Z" }
}
```

### 3.4. AI Decision Document
```json
{
  "_id": { "$oid": "60a7b3faf1d2b82e1c9d2a09" },
  "incidentId": { "$oid": "60a7b2c5f1d2b82e1c9d2a05" },
  "promptTokens": 1024,
  "completionTokens": 256,
  "latencyMs": 1420,
  "modelName": "gemini-2.5-flash",
  "imageFeatures": ["liquid_leakage", "asphalt_erosion", "flooding"],
  "confidenceScore": 0.94,
  "reasoningReport": "### AI Decision Rationale\n- **Visual Analysis**: Extracted visual indicators include liquid flow and pavement degradation. This matches a structural water asset rupture.\n- **Threat Level Assessment**: The incident was assigned a **High** severity because flooding in a major lane (Outer Ring Road) reduces traction and increases accident risks.\n- **Routing**: Allocated to **WATER_BOARD** as underground water asset maintenance falls strictly under their municipal jurisdiction.",
  "nodePath": ["visual_node", "severity_node", "department_node", "eval_node", "explain_node"],
  "executedAt": { "$date": "2026-07-15T14:15:02.000Z" }
}
```

### 3.5. Admin Override Document
```json
{
  "_id": { "$oid": "60a7b45bf1d2b82e1c9d2a12" },
  "incidentId": { "$oid": "60a7b2c5f1d2b82e1c9d2a05" },
  "adminId": { "$oid": "60a7b000f1d2b82e1c9d2a00" },
  "originalField": "severity",
  "previousValue": "High",
  "newValue": "Critical",
  "overrideReason": "Water flow is undermining the foundations of an adjacent power transformer structure, risking localized electrical grids.",
  "createdAt": { "$date": "2026-07-15T14:30:00.000Z" }
}
```

---

## 4. Scaling Strategy
To handle load increases as the system scales past the MVP phase, we implement the following database optimization strategies:

### 4.1. Geospatial Partitioning (Sharding)
MongoDB sharding splits data across multiple database instances. For AI CITY, the natural shard key is location-based to optimize queries.
* **Shard Key Pattern:** `{ category: 1, location: "2dshpere" }` is not natively supported as a compound shard key. Instead, we use a hybrid key:
  `{ geohash: 1, category: 1 }`
* **Implementation:** The backend calculates a geohash prefix (e.g., length 5, representing an area of approximately $4.9\text{ km} \times 4.9\text{ km}$) and writes it to the incident document. Sharding MongoDB clusters by geohash ensures that incidents reported within the same district are physically stored on the same shard node, making geo-queries highly performant.

### 4.2. Database Optimization Rules
1. **Read/Write Segregation:** Use MongoDB Atlas replica sets. The write operations go to the primary node, while operational dashboard reads and Leaflet map tile rendering fetch from secondary nodes (`readPreference=secondaryPreferred`).
2. **Archival Policy:** Incidents resolved more than 6 months ago are moved to an cold storage bucket (e.g., MongoDB Online Archive or AWS S3), keeping the operational working set small.

---

## 5. Database Migration Plan
During rapid development, document structures evolve. We implement the following migration protocol:
* **Strict Validation Rules:** In production, schema changes must be applied via a lightweight script runner (e.g., `db-migrate` or custom migration tasks).
* **Double-Write Strategy:** When introducing a breaking schema transition (e.g., splitting `location` from coordinates into nested structures), the service layer writes to both the old and new fields during the transition period. A background script backfills historic records, and the old field is deprecated and removed in a subsequent release.
