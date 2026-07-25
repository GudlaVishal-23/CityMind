# MVP Scope Document: AI CITY

## 1. Hackathon Scope (36-Hour Boundaries)
The AI CITY MVP is structured to deliver **one polished, end-to-end autonomous workflow**:  
**Autonomous Incident Intelligence** powered by the **AI CITY Brain™**. 

To maximize development speed during the 36-hour hackathon, we bypass heavy enterprise boilerplate like the Repository Pattern, adopting a simplified **Controller → Service → Model** architecture. 

---

## 2. Feature Boundaries

### 2.1. Included Features (In Scope for MVP)
* **Resident Portal (Submission Interface):**
  * Firebase Authenticated login.
  * Direct image upload (Cloudinary storage).
  * Geolocation coordinates pin selector using Leaflet.js.
  * **AI Thinking Timeline:** A visual, animated step-by-step checklist showing the AI CITY Brain's operations.
  * **AI Decision Report Card:** A structured panel showing:
    * Categorization & Summary.
    * Department Allocation (Public Works, Electricity, Water, Sanitation).
    * Severity Assessment Badge + Visual Confidence Bar (`██████████░░ 84%`).
    * Clear bulleted reasons answering **Why** it made the assessment.
    * Estimated Resolution Time.
* **Smart Duplicate Detection:**
  * Checks for similar category reports within a 50-meter radius submitted in the past 48 hours.
  * Links secondary submissions to the parent ticket, informing the resident and preventing redundant dispatches.
* **AI Operations Center (Admin Interface):**
  * Dark-mode telemetry console.
  * **City Health Score Panel:** Real-time metrics showing overall and department-specific health percentages.
  * **AI Heatmap:** Leaflet map overlay visualizing incident concentrations (Red = High Risk, Orange = Medium, Green = Resolved).
  * **AI Decision Audit Drawer:** Drawer sliding out to show image inputs, raw prompt variables, AI latency metrics, and version numbers.

### 2.2. Excluded Features (Strictly Out of MVP)
* **No Repository Boilerplate:** The Express backend uses direct Mongoose model operations inside Services.
* **No External Alert Integrations:** No Email, SMS, or WhatsApp notification APIs.
* **No Worker / Field Dispatch Interfaces:** The backend does not support dispatch routing or field officer app synchronization.
* **No Predictive IoT / Sensors:** No real-time water flow or waste level sensor pipelines.

---

## 3. The 3-Minute Demo Pitch Flow

This demo flow is designed to engage judges by focusing on product storytelling rather than code boilerplate:

```
[0:00 - The Hook] ──► [0:45 - Ingestion] ──► [1:15 - AI Brain] ──► [2:00 - Report] ──► [2:30 - Ops Center]
```

* **0:00 - 0:45: The Hook (The Problem)**
  * Show the AI CITY Landing Page. Explain the problem: legacy city portals are slow, manual CRM databases. Show how AI CITY acts as an **AI Operating System for Smart Cities**.
* **0:45 - 1:15: Resident Incident Ingestion**
  * Log in as Priya Sharma (Resident).
  * Upload a photo of a burst water main on a street. Drop a pin on the map.
  * Click "Submit Incident".
* **1:15 - 2:00: The AI Brain in Action**
  * Show the **AI Thinking Timeline** animating:
    * `[✓] Ingesting Photo & Geolocation...`
    * `[✓] Visual Intelligence Engine processing...`
    * `[✓] Department Allocation Engine resolving...`
  * This timeline demonstrates the system's reasoning process.
* **2:00 - 2:30: The AI Decision Report Card (The Wow Factor)**
  * Render the **AI Decision Report Card**.
  * Highlight the explainability features:
    * Severity: *High* with a visual confidence bar (`94%`).
    * Allocation: *Water Supply Board*.
    * Why: *Water pooling on asphalt threatens traction; water flow indicates subterranean pressure leaks*.
* **2:30 - 3:00: The AI Operations Center**
  * Switch to the Admin view (rename to **AI Operations Center**).
  * Point out the **City Health Score** (91%) and the **AI Heatmap** overlay.
  * Open the newly submitted ticket. Reveal the **AI Decision Audit Drawer** containing the prompt logs, token counts, and execution latency (ms).
  * Demonstrate **Smart Duplicate Detection** by showing how a second submission nearby is grouped under the same ticket.

---

## 4. Acceptance Criteria

### UC-01: Resident Submission & Timeline
* **Given** a logged-in resident on the submission form,
* **When** they submit a photo and location pin,
* **Then** the UI must render the sequential AI Thinking Timeline with animations for each completed state, concluding within 4 seconds.

### UC-02: Smart Duplicate Identification
* **Given** a new incident submitted at coordinate X,
* **When** another active incident of the same category exists within 50 meters submitted within 48 hours,
* **Then** the database must save the submission as `Duplicate`, link it to the parent incident, and show the duplicate notification to the resident.

### UC-03: AI Decision Report Card Delivery
* **Given** an incident submitted to the backend,
* **When** the AI CITY Brain completes the processing run,
* **Then** the response must return the structured schema including category, severity, allocation, explainable bullet points, confidence percentage, and estimated resolution.

### UC-04: Operations Center Display
* **Given** a logged-in administrator opening the AI Operations Center,
* **Then** the dashboard must display the real-time City Health Score panel and map markers categorized by risk level.

---

## 5. Definition of Done (DoD)
1. **Type Safety:** TypeScript compilation without implicit `any` bypasses.
2. **Simplified Schema:** Valid Mongoose schemas with geospatial index configurations.
3. **Responsive UI:** Dark-mode interface scale tested down to mobile displays.
4. **Performance Target:** End-to-end API response time under 5 seconds.
5. **No Placeholders:** All UI components display real data; no "lorem ipsum" text blocks.
