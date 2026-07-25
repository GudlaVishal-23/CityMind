# The Hackathon Bible: AI CITY Execution Playbook

**36-Hour Step-by-Step Implementation & Demo Guide**  
*Document Version:* v1.0  
*Status:* Frozen for Execution  

---

## 1. Frozen Folder Map

### Backend Directory Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   ├── firebase.ts
│   │   └── cloudinary.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── incident.model.ts
│   │   └── aiLog.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   ├── services/
│   │   ├── duplicate.service.ts
│   │   ├── aiBrain.service.ts
│   │   └── incident.service.ts
│   ├── controllers/
│   │   ├── incident.controller.ts
│   │   └── admin.controller.ts
│   ├── routes/
│   │   ├── incident.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── tsconfig.json
└── package.json
```

### Frontend Directory Structure
```
frontend/
├── src/
│   ├── assets/
│   │   └── index.css
│   ├── config/
│   │   ├── firebase.ts
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── store/
│   │   └── uiStore.ts
│   ├── routes/
│   │   ├── AuthGuard.tsx
│   │   └── index.tsx
│   ├── components/
│   │   └── ui/                # Button.tsx, Card.tsx, Progress.tsx, Dialog.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   └── pages/LoginPage.tsx
│   │   ├── incidents/
│   │   │   ├── components/GeopinMap.tsx
│   │   │   ├── components/ThinkingTimeline.tsx
│   │   │   ├── components/ReportCard.tsx
│   │   │   └── pages/IngestionPage.tsx
│   │   └── operations/
│   │       ├── components/HealthPanel.tsx
│   │       ├── components/OperationsMap.tsx
│   │       ├── components/AuditDrawer.tsx
│   │       └── pages/OperationsCenterPage.tsx
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 2. Sequential File Creation Order
To prevent import errors and dependency circularity, follow this sequence exactly:

```
[Phase A: Database & Configs] ──► [Phase B: Backend APIs] ──► [Phase C: Frontend Infrastructure] ──► [Phase D: Ingestion Flow] ──► [Phase E: Operations Center]
```

### Phase A: Core Setup & Database Configuration (Hours 1 - 4)
1. `backend/package.json` & `backend/tsconfig.json`
2. `backend/src/config/db.ts` (Mongoose connection configuration)
3. `backend/src/config/firebase.ts` (Firebase Admin SDK credentials loader)
4. `backend/src/config/cloudinary.ts` (Cloudinary environment setup)
5. `backend/src/models/user.model.ts` (User profile collection)
6. `backend/src/models/incident.model.ts` (Geospatial-indexed incident collection)
7. `backend/src/models/aiLog.model.ts` (AI decision audit collection)

### Phase B: Middlewares, Core Services & Routing (Hours 5 - 12)
8. `backend/src/middleware/error.middleware.ts` (Express global error catcher)
9. `backend/src/middleware/auth.middleware.ts` (Firebase JWT token verification)
10. `backend/src/middleware/validate.middleware.ts` (Zod payload validation helper)
11. `backend/src/services/duplicate.service.ts` (Geospatial proximity query checker)
12. `backend/src/services/aiBrain.service.ts` (Gemini 2.5 SDK classification runner)
13. `backend/src/services/incident.service.ts` (Coordinates duplicates and AI runs)
14. `backend/src/controllers/incident.controller.ts` (Handles submits and queries)
15. `backend/src/controllers/admin.controller.ts` (Handles overrides and health analytics)
16. `backend/src/routes/incident.routes.ts` & `backend/src/routes/admin.routes.ts`
17. `backend/src/routes/index.ts` & `backend/src/app.ts` & `backend/src/server.ts`

### Phase C: Frontend Setup & Shell Layouts (Hours 13 - 16)
18. `frontend/package.json` & `frontend/tailwind.config.js`
19. `frontend/src/assets/index.css` (Tailwind styles and HSL tokens)
20. `frontend/src/config/firebase.ts` & `frontend/src/config/api.ts` (Axios configurations)
21. `frontend/src/store/uiStore.ts` (Zustand client state store)
22. `frontend/src/routes/AuthGuard.tsx` (Decodes JWT token and claims)
23. `frontend/src/routes/index.tsx` (Declarative React Router maps)
24. `frontend/src/components/ui/` (Import Shadcn Radix primitives)

### Phase D: Ingestion & AI Decision Card (Hours 17 - 24)
25. `frontend/src/features/auth/pages/LoginPage.tsx` (Auth interface)
26. `frontend/src/features/incidents/components/GeopinMap.tsx` (Leaflet selection pin)
27. `frontend/src/features/incidents/components/ThinkingTimeline.tsx` (Stepper screen)
28. `frontend/src/features/incidents/components/ReportCard.tsx` (Display results)
29. `frontend/src/features/incidents/pages/IngestionPage.tsx` (Submission form)

### Phase E: Operations Center Dashboard (Hours 25 - 32)
30. `frontend/src/features/operations/components/HealthPanel.tsx` (City Health gauges)
31. `frontend/src/features/operations/components/OperationsMap.tsx` (Heatmap toggle map)
32. `frontend/src/features/operations/components/AuditDrawer.tsx` (Telemetry inspector)
33. `frontend/src/features/operations/pages/OperationsCenterPage.tsx` (Dashboard page)

---

## 3. Implementation Checklists

### Database Checklist
* [ ] Spin up MongoDB Atlas free tier cluster. Set network access to `0.0.0.0/0` for the hackathon.
* [ ] Create compound index `{ department: 1, status: 1 }` on `incidents`.
* [ ] Create compound index `{ status: 1, severity: -1 }` on `incidents`.
* [ ] Configure the `2dsphere` index on the `location` coordinates array.

### API & Middleware Checklist
* [ ] Validate Firebase JWT verification middleware handles token expirations.
* [ ] Confirm Zod validation middleware intercepts requests and returns normalized JSON error arrays.
* [ ] Implement Winston error logging for caught API exceptions.

### AI Prompt Checklist
* [ ] Use Gemini 2.5 Flash. Set temperature to `0.1` to ensure stable JSON outputs.
* [ ] Enforce output validation using the Gemini response schema configuration.
* [ ] **Core System Prompt:**
  ```
  You are the AI CITY Brain. Ingest the provided photo and description. Return a structured JSON containing:
  - category: String
  - severity: Enum ['Low', 'Medium', 'High', 'Critical']
  - department: Enum ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION']
  - confidence: Float [0.0 to 1.0]
  - why: Array of strings explaining choices
  - estimatedResolution: String
  ```

### UI & Styling Checklist
* [ ] Define background HSL colors in `index.css`.
* [ ] Configure glassmorphism CSS class properties.
* [ ] Enable responsive layout scaling (down to 320px).

---

## 4. Deployment Checklist
* [ ] **Vercel Frontend Deployment:**
  * Configure environment variables: `VITE_FIREBASE_API_KEY`, `VITE_BACKEND_URL`.
  * Set framework target to Vite.
* [ ] **Render Backend Deployment:**
  * Deploy using Docker environment files.
  * Configure environment variables: `MONGO_URI`, `GEMINI_API_KEY`, `CLOUDINARY_URL`, `FIREBASE_SERVICE_ACCOUNT_BASE64`.
  * Enable keep-alive monitoring (e.g. UptimeRobot) to prevent free-tier spin-down delays.

---

## 5. Demo Storyboard & Script (The 3-Minute Pitch)

```
[0:00 - The Hook] ──► [0:45 - Ingestion] ──► [1:15 - AI Brain] ──► [2:00 - Report] ──► [2:30 - Ops Center]
```

### 0:00 - 0:45: The Hook (Presenter 1)
* **Visual:** Display the Landing Page (`/`). Grid lines animate, logo glowing.
* **Script:**
  > *"Every year, cities waste millions of dollars triaging civic complaints. Traditional city portals are slow, manual CRM databases. We built AI CITY: an Agentic AI Operating System for Smart Cities. It takes raw resident reports and processes them through an autonomous decision graph. Let's see it in action."*

### 0:45 - 1:15: Resident Submission (Presenter 1)
* **Visual:** Log in as a resident (`/login`). Access the submission portal. Upload a photo of a burst water main on a street. Drop a pin on the map. Click "Submit Incident".
* **Script:**
  > *"I am logged in as resident Priya. I encounter a water line rupture on my street. I upload a photo, drop a pin on the map to mark the location, and click submit. There are no complicated forms or department drop-downs. The AI handles the triage."*

### 1:15 - 2:00: The AI Brain in Action (Presenter 2)
* **Visual:** The UI transitions to the **AI Thinking Timeline** (`/citizen/report`). Stepper animations check off in sequence.
* **Script:**
  > *"As the submission completes, the AI CITY Brain processes the report. Our decision graph analyzes the image, calculates the safety threat, and identifies the responsible department. The timeline shows this reasoning process in real time."*

### 2:00 - 2:30: The AI Decision Report Card (Presenter 2)
* **Visual:** The **AI Decision Report Card** renders on the screen. Point out the High severity badge, the Water Board routing, and the bulleted reasons.
* **Script:**
  > *"In under 3 seconds, the report is compiled. The AI identifies a ruptured pipe, calculates a High severity rating with 94% confidence due to road erosion risks, and routes the ticket to the Water Board. It also generates clear, bulleted explanations for the resident."*

### 2:30 - 3:00: The AI Operations Center (Presenter 1 or 2)
* **Visual:** Switch view to the **AI Operations Center** (`/ops`). Show the City Health score gauges, the heatmap toggle, and double-click the ticket to reveal the **AI Decision Audit Drawer**.
* **Script:**
  > *"For operators, AI CITY provides a real-time command dashboard. The City Health Score calculates infrastructure stability. On the map, the AI Heatmap visualizes incident concentrations. Double-clicking our ticket opens the AI Decision Audit Drawer. Operators can inspect processing latency, prompt tokens, and even override the AI's routing choices if needed. AI CITY is the foundation of a modern, responsive smart city."*
