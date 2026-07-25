# Product Requirements Document (PRD): AI CITY

## 1. Executive Summary
AI CITY is an **Autonomous Civic Operations Platform** designed as an AI Operating System for Smart Cities. Moving away from traditional database portals, AI CITY functions as an automated decision engine. The platform takes raw citizen incident reports (photos, GPS coordinates, descriptions) and processes them through the **AI CITY Brain™**—an agentic orchestration graph. 

The MVP demonstrates the core module: **Autonomous Incident Intelligence**, automating incident ingestion, severity assessment, department allocation, and generating an explainable **AI Decision Report**.

---

## 2. "Why AI?" – Core Strategic Rationale

Judges, administrators, and engineers ask: *Why not just write standard rules, or use simple Machine Learning models?* AI CITY operates on **Agentic Decision Intelligence** for the following reasons:

* **Why Not Rules/RegEx?** 
  Rule-based keyword matching fails to handle conversational human descriptions. A citizen writing *"There is a river flowing down the boulevard"* describes a burst water main, not a weather event. Rules cannot parse these semantic variations.
* **Why Not Traditional ML?** 
  Classic supervised classifiers (like Random Forests or basic ResNet image classifiers) require massive, custom-labeled civic datasets and separate infrastructure. They output basic labels (e.g., "pothole") without understanding *contextual risk* (e.g., a pothole next to a school zone is more critical than one in an empty field).
* **Why Agentic AI (LangGraph + Gemini)?** 
  Agentic AI simulates human operational reasoning. By mapping tasks to specialized nodes inside a state chart, the system can perform multi-step analysis:
  1. *Understand:* Parse the image context and text description together.
  2. *Assess:* Cross-reference visual indicators with location metadata to estimate hazard threat levels.
  3. *Allocate:* Route the incident based on municipal department jurisdictions.
  4. *Explain:* Synthesize conversational rationale, explaining *why* decisions were made.
* **Why LangGraph?** 
  Unlike linear LLM execution wrappers, LangGraph allows for cycle-based logic. If confidence falls below our 82% threshold, the graph loops back, attempts secondary resolution paths, or routes the incident for manual verification.

---

## 3. Product Terminology Refinement
To maintain an enterprise-grade tone, the platform strictly uses the following terms:

| Legacy Term | AI CITY Term | Description |
| :--- | :--- | :--- |
| Complaint / Ticket | **Incident** | The recorded problem report on the city grid. |
| Priority (Low/High) | **Severity Assessment** | The calculated safety threat metric. |
| Routing / Department | **Department Allocation** | The operational dispatch mapping. |
| Reasoning / Summary | **Operational Decision (AI Decision Report)** | The explainable log explaining the system's choice. |
| Ticket Tracking | **Resolution Tracking** | The end-to-end status flow. |
| Admin Dashboard | **AI Operations Center** | The primary municipal dashboard interface. |

---

## 4. The Core Engine: AI CITY Brain™
The central intelligence of the platform is the **AI CITY Brain™**, which houses five sub-engines:

```
                      ┌────────────────────────────────────────┐
                      │            AI CITY Brain™              │
                      └──────────────────┬─────────────────────┘
                                         │
         ┌──────────────────┬────────────┴─────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│     Visual      ││    Severity     ││   Department    ││   Reasoning &   │
│  Intelligence   ││   Assessment    ││   Allocation    ││    Explanation  │
│     Engine      ││     Engine      ││     Engine      ││     Engine      │
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
```

1. **Visual Intelligence Engine:** Analyzes image details to identify physical damage vectors (cracks, liquid flow, exposed wires).
2. **Severity Assessment Engine:** Evaluates safety threat levels using visual data and location contexts.
3. **Department Allocation Engine:** Assigns incidents to specific service departments (Public Works, Electricity, Water Board, Sanitation).
4. **Reasoning & Explanation Engine:** Formulates markdown-based descriptions explaining the "Why" behind the severity and allocation decisions.

---

## 5. Key MVP Functional Requirements

### 5.1. Citizen Interface & Submission Flow
* **Interactive Geo-Pinning:** Integrates with Leaflet.js to capture exact incident coordinates.
* **AI Thinking Timeline (Checklist):** Instead of a static loader during submission, the client displays a live timeline checklist of the AI CITY Brain's operations:
  * `[✓] Ingesting Photo & Geolocation Data...`
  * `[✓] Parsing Visual Hazard Indicators...`
  * `[✓] Evaluating Severity Assessment Parameters...`
  * `[✓] Allocating to Correct Municipal Department...`
  * `[✓] Synthesizing AI Decision Report...`
* **Signature Output: The AI Decision Report Card:** Displays immediately after submission. 

```
┌────────────────────────────────────────────────────────┐
│               AI DECISION REPORT CARD                  │
├────────────────────────────────────────────────────────┤
│ Summary: Road Surface Damage Detected                  │
│ Visual Analysis: Active water pool + deep pavement gap │
│                                                        │
│ Severity: HIGH (██████████░░ 84%)                      │
│ Allocation: Water Supply & Sewerage Board              │
│                                                        │
│ Rationale: Pervasive water flow indicates a pipe leak  │
│ under the asphalt, threatening vehicle traction.       │
│                                                        │
│ Estimated Resolution Time: 24 Hours                    │
└────────────────────────────────────────────────────────┘
```

### 5.2. Smart Duplicate Detection (Edge Cases)
To prevent operational duplication, the backend runs automated spatial-temporal checks:
* **Rule:** If a newly submitted incident shares the same **category** and is within **50 meters** of an active incident submitted within the past **48 hours**:
  * Flag the new submission as `Duplicate`.
  * Display a notification card: *"Duplicate Found: This issue has already been reported 18 meters away. Status: In Progress. We have linked your report to Ticket #104."*
  * Increment the duplicate citizen witness count on the parent ticket.

### 5.3. AI Operations Center (Admin Console)
* **City Health Score Panel:** Displays real-time operational health scores:
  * *City Health Index:* Calculated globally (weighted inversely by total open high-severity incidents).
  * *Department Specific Health:* e.g., Road Health 84%, Water Network Health 96%, Grid Electrical Health 92%.
* **Live Operations View:** Lists active incidents with real-time status updates.
* **Interactive AI Heatmap:** Renders red (critical/high-risk), orange (medium-risk), and green (resolved/safe) zones.
* **AI Decision Audit Drawer:** Slides open to show:
  * Original image.
  * Computed severity variables.
  * The raw prompt log, latency telemetry (ms), model details, and decision versions.

---

## 6. Technical Stack & Simplified MVP Architecture
To support rapid development during the 36-hour hackathon, we simplify the backend architecture by skipping the repository pattern:
* **Client:** React 19, TypeScript, Tailwind CSS, Framer Motion, Leaflet.
* **API Service:** Node.js, Express.js, TypeScript.
* **Data Flow:** **Controller → Service → Model**.
  * Business logic and AI orchestration reside in the Service layer.
  * Services query Mongoose Models directly, minimizing boilerplate files.
* **AI Engine:** LangGraph, LangChain, Gemini 2.5 Flash.

---

## 7. Target Personas

### Persona 1: The Alert Resident (Priya Sharma, 28)
* **Need:** Safe walking routes, transparent local administration.
* **Use Case:** Encounters a broken street pole with exposed wires on her evening run. She uploads a photo, drops a map pin, and submits. The system runs the AI Thinking Timeline, outputs an AI Decision Report marking it as "Critical" (due to high-voltage risk), routes it to the Electricity Board, and shows her *why*.

### Persona 2: The Operations Director (Rajesh Kumar, 52)
* **Need:** Real-time city monitoring, automated dispatches, zero duplicate workflows.
* **Use Case:** Monitors the AI Operations Center map. He sees the City Health Score adjust, tracks incident hot-spots on the AI Heatmap, and clicks an incident. He inspects the AI Decision Audit Drawer to confirm the system's reasoning before crews are dispatched.
