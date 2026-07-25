# API Specification: AI CITY

**Production-Grade RESTful API Contracts**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Global Specifications & Error Format
All endpoints return standard JSON payloads. Errors are normalized to ensure predictable parsing by the frontend client.

### Standard Success Structure
```json
{
  "success": true,
  "data": {}
}
```

### Standard Error Structure
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for request parameters.",
    "details": [
      {
        "field": "location.lat",
        "issue": "Latitude must be a valid number between -90 and 90"
      }
    ]
  }
}
```

### Global Status Codes
* `200 OK`: Request succeeded. Returned on standard lookups and updates.
* `201 Created`: Submission successful. Returned on new resources.
* `400 Bad Request`: Payload validation (Zod) failed or invalid parameter formats.
* `401 Unauthorized`: Missing or expired Firebase JWT token.
* `403 Forbidden`: Authenticated, but lacking sufficient permissions (e.g. citizen accessing administrative routes).
* `404 Not Found`: Target resource identifier does not exist in the database.
* `429 Too Many Requests`: Rate limiter triggered.
* `500 Internal Server Error`: Server exception or third-party service timeout.

---

## 2. Authentication Endpoint

### `POST /api/auth/sync`
* **Purpose:** Syncs Firebase user identity credentials into the local MongoDB database during initial login.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `citizen`, `admin`
* **Request Header:**
  `Authorization: Bearer eyJhbGciOi...`
* **Request Body:** None (information is extracted from the Firebase JWT).
* **Validation Rules:** The bearer token must be decryptable by the Firebase Admin SDK.
* **Status Codes:**
  * `200 OK` (Sync complete, user profile existed)
  * `201 Created` (Sync complete, user profile newly registered)
  * `401 Unauthorized` (Token invalid)
* **Response Example (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "userId": "60a7b1b2f1d2b82e1c9d2a01",
      "email": "priya.sharma@gmail.com",
      "role": "citizen"
    }
  }
  ```

---

## 3. Incident Ingestion APIs

### `POST /api/incidents`
* **Purpose:** Ingests a new civic incident, checks for duplicates, and executes the **AI CITY Brain™** pipeline if unique.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `citizen`, `admin`
* **Request Body Schema (Zod):**
  ```typescript
  {
    title: z.string().min(5).max(100),
    description: z.string().min(10),
    imageUrl: z.string().url(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  }
  ```
* **Duplicate Detection Rules:**
  Runs a geospatial check. If another incident matching the same **category** exists within **50 meters** submitted within the past **48 hours** with `isDuplicate: false`, the new incident is flagged as `Duplicate` and linked to the parent.
* **Status Codes:**
  * `201 Created` (Unique incident ingest and AI processing successful)
  * `200 OK` (Duplicate incident detected and successfully linked)
  * `400 Bad Request` (Zod schema validation failed)
  * `401 Unauthorized` (Auth missing)
* **Response Example (`201 Created` - Unique Ingest):**
  ```json
  {
    "success": true,
    "duplicateFound": false,
    "data": {
      "incidentId": "60a7b2c5f1d2b82e1c9d2a05",
      "title": "Burst Water Pipe on Outer Ring Road",
      "description": "A massive volume of water is gushing out from under the pavement, flooding the left lane.",
      "imageUrl": "https://res.cloudinary.com/aicity/image/upload/v1721052600/incidents/water_leak_1.jpg",
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716]
      },
      "category": "WaterBurst",
      "severity": "High",
      "department": "WATER_BOARD",
      "status": "AI_Assigned",
      "witnessCount": 1,
      "aiReport": {
        "confidence": 0.94,
        "why": [
          "Visual indicators match a structural water asset rupture",
          "Flooding in Outer Ring Road reduces traction and creates accident hazards",
          "Water volume indicates high pressure line compromise"
        ],
        "estimatedResolution": "24 Hours"
      },
      "createdAt": "2026-07-15T14:15:00.000Z"
    }
  }
  ```
* **Response Example (`200 OK` - Duplicate Linked):**
  ```json
  {
    "success": true,
    "duplicateFound": true,
    "parentIncidentId": "60a7b2c5f1d2b82e1c9d2a05",
    "message": "Incident already reported 18 meters away. We have linked your report to Ticket #104."
  }
  ```

---

## 4. Operational & Telemetry APIs

### `GET /api/incidents`
* **Purpose:** Retrieves a paginated list of incidents. Used by operators in the AI Operations Center and citizens in their dashboards.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `citizen`, `admin`
* **Query Parameters:**
  * `page` (optional, default: 1)
  * `limit` (optional, default: 20)
  * `department` (optional, filter for operators: `PWD`, `ELECTRICITY`, etc.)
  * `severity` (optional: `Low`, `Medium`, `High`, `Critical`)
  * `status` (optional: `Submitted`, `AI_Assigned`, `In_Progress`, `Resolved`)
  * `search` (optional, matches title/description keywords)
* **Rules:** If the requesting user's role is `citizen`, the query is hardcoded to return only incidents matching `citizenId === req.user.id`. Operators see all incidents.
* **Status Codes:**
  * `200 OK` (Fetch successful)
  * `401 Unauthorized` (Token invalid)
* **Response Example (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "incidents": [
        {
          "_id": "60a7b2c5f1d2b82e1c9d2a05",
          "title": "Burst Water Pipe on Outer Ring Road",
          "category": "WaterBurst",
          "severity": "High",
          "department": "WATER_BOARD",
          "status": "AI_Assigned",
          "witnessCount": 4,
          "createdAt": "2026-07-15T14:15:00.000Z"
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 20,
        "pages": 1
      }
    }
  }
  ```

### `GET /api/analytics/health`
* **Purpose:** Calculates real-time city and department infrastructure health indices.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `admin`
* **Status Codes:**
  * `200 OK` (Analytics calculations successful)
  * `403 Forbidden` (User is not admin)
* **Response Example (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "globalHealthIndex": 91,
      "departments": {
        "WATER_BOARD": 96,
        "ELECTRICITY": 92,
        "PWD": 84,
        "SANITATION": 93
      },
      "activeIncidents": {
        "Critical": 2,
        "High": 5,
        "Medium": 12,
        "Low": 18
      }
    }
  }
  ```

---

## 5. AI Audit & Override APIs

### `GET /api/incidents/:id/audit`
* **Purpose:** Retrieves the underlying AI execution logs, prompt variables, and token telemetry for the Audit Drawer.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `admin`
* **Status Codes:**
  * `200 OK` (Audit log found)
  * `404 Not Found` (Incident or associated audit log not found)
  * `403 Forbidden` (User is not admin)
* **Response Example (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "incidentId": "60a7b2c5f1d2b82e1c9d2a05",
      "telemetry": {
        "modelName": "gemini-2.5-flash",
        "latencyMs": 1420,
        "promptTokens": 1024,
        "completionTokens": 256,
        "confidenceScore": 0.94,
        "nodePath": ["visual_node", "severity_node", "department_node", "eval_node", "explain_node"]
      },
      "inputs": {
        "rawDescription": "A massive volume of water is gushing out from under the pavement, flooding the left lane.",
        "imageUrl": "https://res.cloudinary.com/aicity/image/upload/v1721052600/incidents/water_leak_1.jpg"
      },
      "extractedFeatures": ["liquid_leakage", "asphalt_erosion", "flooding"],
      "reasoningReport": "### AI Decision Rationale\n- **Visual Analysis**: Extracted visual indicators include liquid flow and pavement degradation. This matches a structural water asset rupture.\n- **Threat Level Assessment**: The incident was assigned a **High** severity because flooding in a major lane reduces traction and increases accident risks.\n- **Routing**: Allocated to **WATER_BOARD** as underground water asset maintenance falls strictly under their municipal jurisdiction."
    }
  }
  ```

### `PATCH /api/incidents/:id/override`
* **Purpose:** Allows administrative operators to override AI-assigned values.
* **Authentication:** Bearer token (Firebase User JWT).
* **Allowed Roles:** `admin`
* **Request Body Schema (Zod):**
  ```typescript
  {
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    department: z.enum(['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION']).optional(),
    reason: z.string().min(15) // Force a minimum rationale length
  }
  ```
* **Validation Rules:** Must contain at least one of `severity` or `department`. The reasoning string must be at least 15 characters long.
* **Status Codes:**
  * `200 OK` (Override applied and saved to audit logs)
  * `400 Bad Request` (Validation errors or missing override values)
  * `404 Not Found` (Incident ID does not exist)
* **Response Example (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "AI allocation updated. Log stored in Admin Overrides.",
    "data": {
      "incidentId": "60a7b2c5f1d2b82e1c9d2a05",
      "severity": "Critical",
      "department": "WATER_BOARD",
      "status": "In_Progress",
      "modifiedByOperator": true
    }
  }
  ```
