# Development Roadmap & Hackathon Blueprint: AI CITY

**36-Hour Hackathon Milestones & Resource Allocation**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Hackathon Execution Overview
To successfully ship **AI CITY v1.0** within a 36-hour hackathon, we divide development into parallel workstreams. The critical path focuses on establishing core database schemas, integrating Firebase Auth, running end-to-end AI classifications, and polishing the visual telemetry dashboards.

---

## 2. 36-Hour Hourly Milestones

### Hour 1 - 4: Foundation & Infrastructure Setups

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Initialize Vite + TypeScript repository. Set up Tailwind CSS, CSS variables, and import Google fonts (Outfit, Inter). | React 19 boilerplate, routes layout configuration. |
| **Backend** | Initialize Express + TS server. Set up environment variables, Winston logger, and rate-limiting middleware. | Working server port listening, logging framework. |
| **AI** | Configure Google Gen AI SDK client. Test basic API calls to the Gemini model with a mock incident payload. | Verified Gemini developer connectivity. |
| **Database** | Spin up MongoDB Atlas cluster. Configure access parameters and test backend connection string. | Connected MongoDB service instance. |
| **Deployment**| Initialize Vercel and Render draft apps. Link GitHub repositories to trigger build hooks. | Automatic CD pipeline checks running. |

---

### Hour 5 - 8: Schema Implementation & Edge Auth Integration

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Implement Firebase Auth SDK wrapper. Design Login view and Citizen navigation header. | Working user login and registration forms. |
| **Backend** | Configure Firebase Admin SDK. Implement Auth middleware to extract user context. | Secured endpoints returning user context. |
| **AI** | Draft the prompt templates for Stage 1 (Understanding) and Stage 2 (Severity). | Initial prompts verified in AI tools. |
| **Database** | Write User and Incident Mongoose schemas. Configure the spatial `2dsphere` index. | Verified DB indexes in Atlas. |
| **Deployment**| Test CD compilation on Vercel and Render. Resolve any build errors. | Clean deployment checkmarks. |

---

### Hour 9 - 12: Core API Endpoints & Duplicate Checking Logic

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Build the Incident Ingestion form. Integrate Leaflet.js map and coordinate pinning. | Working map selection UI. |
| **Backend** | Write `POST /api/incidents` route handler. Implement spatial checking logic. | Duplicate detection API returning mock payloads. |
| **AI** | Draft the prompts for Stage 3 (Routing) and Stage 4 (Explanation). | Verified routing allocation logic. |
| **Database** | Implement `AdminOverrides` and `AIDecisions` schemas. | Database structures fully defined. |
| **Deployment**| Validate MongoDB Atlas spatial query performance under simulated loads. | Database response times verified. |

---

### Hour 13 - 16: AI CITY Brain™ Integration

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Integrate Cloudinary unsigned upload preset for direct image uploads. | Direct image upload from client with preview. |
| **Backend** | Build the 5-Stage AI CITY Brain orchestrator. Connect Express service to Gemini. | Working AI processing pipeline. |
| **AI** | Refine prompting templates and evaluate output JSON formats. | Consistent JSON classification output. |
| **Database** | Configure logic to write AI decisions and token counts to database. | Complete decision logging. |
| **Deployment**| Measure AI API response latency and implement exponential backoff. | Network error fallback protocols operational. |

---

### Hour 17 - 20: End-to-End Integration Check

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Connect the Ingestion page to the backend. Implement the **AI Thinking Timeline** animation. | Visual timeline syncs with backend processing. |
| **Backend** | Connect duplicate checking logic to the database and link duplicate reports. | Working duplicate detection flow. |
| **AI** | Implement the confidence evaluator rule and fallback queue routing. | Low-confidence routing operational. |
| **Database** | Verify coordinate collections and geospatial queries. | Geo-queries operating correctly. |
| **Presentation**| Record a backup video of the working ingestion flow in case of demo issues. | Ingestion workflow video recorded. |

---

### Hour 21 - 24: AI Operations Center Implementation

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Build the AI Operations Center. Implement Leaflet incident markers and heatmap toggle. | Interactive operational map displaying active incidents. |
| **Backend** | Write `GET /api/incidents` and `GET /api/analytics/health` endpoints. | Data APIs returning operational health metrics. |
| **Database** | Configure compound index optimizations for queue sorting. | Optimized query performance. |
| **Deployment**| Confirm CD builds are stable. Review logs for any system warnings. | Live staging environments verified. |

---

### Hour 25 - 28: Audit Drawer & Operator Overrides

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Build the Radix sliding **AI Decision Audit Drawer** and the override forms. | Drawer sliding open and displaying details. |
| **Backend** | Write `PATCH /api/incidents/:id/override` endpoint and verify inputs. | Override logic updates DB status. |
| **Database** | Verify that admin overrides write correctly to log collections. | Audit logs recorded. |
| **Presentation**| Record a backup video of the operations dashboard and override flow. | Operations dashboard video recorded. |

---

### Hour 29 - 32: Visual Polishing & UI Optimization

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Polish visual components (glassmorphism cards, indicators, chart animations). | Sleek dashboard UI. |
| **Backend** | Configure Helmet security headers and CORS access configurations. | Hardened Express application. |
| **AI** | Optimize prompt lengths to reduce token counts and latency. | AI response times under 3 seconds. |
| **Presentation**| Draft the pitch slide deck. Outline the narrative flow and key demo features. | Slide deck completed. |

---

### Hour 33 - 36: Final Polish, Demos, & Deployments

| Lane | Planned Activities | Output Deliverables |
| :--- | :--- | :--- |
| **Frontend** | Complete final UX checks, including accessibility focus management. | Fully tested, responsive UI. |
| **Backend** | Monitor live backend performance under concurrent request loads. | Zero server failures under load. |
| **Deployment**| Freeze production builds. Complete a full manual walkthrough of the live demo. | Production environment ready. |
| **Presentation**| Rehearse the 3-minute pitch. Confirm backup videos are ready. | Pitch timing locked. |

---

## 3. Critical Path
The critical path defines the sequence of dependent tasks necessary to ship the MVP:

```
[Spin DB & Server] ──► [Auth Sync] ──► [Ingest & Geo Map] ──► [AI Brain Node Ingest] ──► [Structured JSON output] ──► [Ops Center Map & Drawers] ──► [Operator Overrides] ──► [Deployment Freeze]
```

To ensure success, any delay along this path must be resolved immediately by redirecting team resources.

---

## 4. Risk Mitigation & Backup Strategy

### 4.1. Core Risks and Mitigation Steps
* **Risk 1: Gemini API Outages or Latency Spikes during Live Demo**
  * *Mitigation:* Implement the backend fallback logic (Severity `Medium`, Department `PWD`). Additionally, prepare local mock endpoints that return static JSON payloads, allowing the frontend to operate even if external networks fail.
* **Risk 2: Live GPS Inaccuracies during Presentation**
  * *Mitigation:* Pre-seed the MongoDB database with realistic coordinates from the demo city area. During the presentation, use pre-selected coordinate buttons rather than relying on live mobile geolocation.
* **Risk 3: Deployment failures in Render or Vercel**
  * *Mitigation:* Set up deployments on Hour 1. Deploy small changes incrementally to isolate and resolve compile errors early.

### 4.2. Presentation Preparation Rules
* Keep the pitch deck simple. Focus on the core value proposition: **how AI CITY automates manual routing tasks using AI.**
* Rehearse the 3-minute pitch. Ensure the speaker transition occurs around the 1:30 mark.
* Use high-quality screen recordings for slides in case live internet connectivity is slow at the venue.
