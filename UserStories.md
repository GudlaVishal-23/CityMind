# User Stories: AI CITY

This document compiles the user stories driving the development of the AI CITY platform. It covers the core MVP roles (Resident, Operator, AI System) and outlines the specifications for future extensions (Field Officer).

---

## 1. Resident User Stories

### US-01: Multimodal Incident Ingestion
* **Format:** As a Resident, I want to upload a photo of a civic incident along with a description, so that I can report issues without typing technical jargon.
* **Acceptance Criteria:**
  * Support file uploads for PNG, JPG, and WEBP formats up to 5MB.
  * Preview image immediately upon upload.
  * Enable deletion and replacement of the image prior to submission.

### US-02: Precise Geospatial Pinning
* **Format:** As a Resident, I want to select the exact location of the incident on a map using my device's GPS or by dropping a pin, so that repair crews know the exact location.
* **Acceptance Criteria:**
  * Auto-detect location using HTML5 Geolocation API with user permission.
  * Provide fallback search/drag pinning via Leaflet map interface.
  * Store exact latitude and longitude coordinates in the incident payload.

### US-03: AI Thinking Timeline
* **Format:** As a Resident, I want to watch a step-by-step progress animation while the AI processes my ticket, so that I know the system is actively evaluating the report.
* **Acceptance Criteria:**
  * Display sequential checkmarks: `Ingesting Photo & Coordinates...` -> `Visual Intelligence Engine Processing...` -> `Severity Assessment Engine Resolving...` -> `Department Allocation Engine Resolving...` -> `Synthesizing AI Decision Report...`.
  * Transition steps using Framer Motion animations with a maximum total duration of 4 seconds.

### US-04: AI Decision Report Card
* **Format:** As a Resident, I want to receive a visual report immediately after submission, so that I can see the calculated severity, department, confidence level, and explanation for my report.
* **Acceptance Criteria:**
  * Render a structured "Report Card" container.
  * Display Severity (Low, Medium, High, Critical) with a visual confidence bar (e.g., `██████████░░ 84%`).
  * List explainable bullet points detailing the **Why** behind the decisions.
  * Show estimated resolution time (e.g., "24 Hours").

### US-05: Secure Firebase Authentication
* **Format:** As a Resident, I want to sign up and log in securely using Firebase Auth, so that my personal details are protected.
* **Acceptance Criteria:**
  * Support email/password registration and Google OAuth provider.
  * Maintain session persistence across browser refreshes.
  * Redirect to the submission dashboard upon successful authentication.

### US-06: Mobile-Responsive Ingestion Form
* **Format:** As a Resident, I want to access the submission portal on my mobile browser, so that I can report incidents immediately when I encounter them.
* **Acceptance Criteria:**
  * Viewport scales correctly down to 320px width without horizontal scrolling.
  * Touch targets (buttons, map pins) are at least 48px x 48px to accommodate mobile interaction.

### US-07: Descriptive Input Validation
* **Format:** As a Resident, I want to receive clear validation errors if I try to submit without a photo or location, so that I know what information is missing.
* **Acceptance Criteria:**
  * Highlight the missing field (e.g., empty image container) with a red border and helper text.
  * Disable the "Submit" button until both image and location coordinates are valid.

### US-08: Transparent Resolution Tracking
* **Format:** As a Resident, I want to view a timeline of my incident from "AI Classified" to "Resolved," so that I know the municipality is actively working on the issue.
* **Acceptance Criteria:**
  * Render a vertical stepper UI component indicating date and state transition.
  * Highlight current status in active green/orange indicator color.

---

## 2. Municipal Operator User Stories (AI Operations Center)

### US-09: AI Operations Center Telemetry
* **Format:** As a Municipal Operator, I want a high-density dashboard that displays all active incidents in the city, so that I can monitor operations and service levels in real-time.
* **Acceptance Criteria:**
  * Show total open incidents, active dispatches, and average resolution times.
  * Refresh data programmatically without full page reloads.

### US-10: City Health Score Panel
* **Format:** As a Municipal Operator, I want to see real-time city health score percentages on my dashboard, so that I can evaluate municipal infrastructure stability.
* **Acceptance Criteria:**
  * Display a global "City Health Index" (e.g., 91%).
  * Display department-specific health indicators: Road Health, Water network Health, Grid Electrical Health.
  * Update scores dynamically as incidents are reported and resolved.

### US-11: Geospatial AI Heatmap
* **Format:** As a Municipal Operator, I want to toggle an AI Heatmap overlay, so that I can identify high-risk incident concentrations.
* **Acceptance Criteria:**
  * Dynamic toggle switch to replace standard markers with a density heat map.
  * Render heat levels using standard color gradients (Red = high risk, Orange = medium risk, Green = safe).

### US-12: AI Decision Audit Logs
* **Format:** As a Municipal Operator, I want to slide open a drawer containing the complete telemetry of the AI's triage process, so that I can audit and verify the system's routing logic.
* **Acceptance Criteria:**
  * Display full-size uploaded image, coordinates, time submitted, and resident description.
  * Render the complete reasoning markdown document generated by the AI CITY Brain.
  * Show raw prompt logs, API token usage, and processing latency (ms).

### US-13: Operator Override Loop
* **Format:** As a Municipal Operator, I want to manually override the AI's assigned severity or department, so that I can correct errors and redirect resources to critical tasks.
* **Acceptance Criteria:**
  * Provide dropdown menus to modify `severity` and `department` fields.
  * Require a text explanation log (minimum 15 words) justifying the override.
  * Save the change, updating the database record and flagging it as `Manually Overridden`.

### US-14: Advanced Queue Filtering
* **Format:** As a Municipal Operator, I want to filter the incident list by department, severity level, and creation date, so that I can focus on resolving issues within specific zones.
* **Acceptance Criteria:**
  * Multi-select filter inputs with immediate list updates (no reload).
  * URL query sync to allow bookmarking specific filter states.

### US-15: Incident Search & Highlighting
* **Format:** As a Municipal Operator, I want to search for incidents by resident name, ID, or keywords, so that I can quickly reference a specific incident during inquiries.
* **Acceptance Criteria:**
  * Search field processes text inputs and filters the table matching records instantly.
  * Highlight the matching query string within the table rows.

### US-16: Operations Analytics Charts
* **Format:** As a Municipal Operator, I want to view bar and doughnut charts representing the distribution of incidents across departments, so that I can balance workload budgets.
* **Acceptance Criteria:**
  * Use visual charting library (Recharts or Chart.js) styled in line with the dark theme.
  * Provide tooltips showing exact numbers on hover.

---

## 3. AI System User Stories (Core Engine Specs)

### US-17: Visual Feature Extraction
* **Format:** As the AI System, I want to parse the uploaded image binary to detect infrastructure damage features, so that I can identify what physical object is broken.
* **Acceptance Criteria:**
  * Run image buffer through Gemini 2.5 Flash API.
  * Extract primary features (e.g. cracked tarmac, water flow, exposed wiring).
  * Output confidence scores for the detected objects in structured logs.

### US-18: Severity Assessment Calculation
* **Format:** As the AI System, I want to evaluate safety risks (e.g., pedestrian traffic, vehicular traffic, fire hazard) of an incident, so that I can calculate an objective severity rating.
* **Acceptance Criteria:**
  * Check coordinates and description against default risk matrices.
  * Return severity strictly matching one of the values: `Low`, `Medium`, `High`, `Critical`.

### US-19: Structured JSON Output Enforcement
* **Format:** As the AI System, I want to enforce strict JSON schemas on model responses, so that the Express backend can reliably read and parse the categorization decisions.
* **Acceptance Criteria:**
  * Set Gemini request options to `responseSchema` or enforce JSON schemas.
  * Throw validation errors and trigger auto-retry if schema parsing fails.

### US-20: Department Allocation Mapping
* **Format:** As the AI System, I want to map the categorized incident to a specific municipal department code, so that it is placed in the correct queue.
* **Acceptance Criteria:**
  * Select from exactly: `PWD`, `ELECTRICITY`, `WATER_BOARD`, `SANITATION`.
  * Base mapping on structural rules: e.g., flooded roads go to `WATER_BOARD` if pipe leak, `PWD` if drainage block.

### US-21: Conversational Rationale Synthesis
* **Format:** As the AI System, I want to generate a natural language paragraph detailing the factors behind the severity rating and allocation, so that humans can trust and understand my decisions.
* **Acceptance Criteria:**
  * Output a conversational explanation in Markdown format.
  * Detail the inputs (image features, description) and explain the logical deduction.

### US-22: Smart Duplicate Detection Check
* **Format:** As the AI System, I want to cross-reference coordinates and categories of incoming reports with recent submissions, so that I can flag duplicate filings of the same physical issue.
* **Acceptance Criteria:**
  * Query database for incidents of the same category within a 50-meter radius submitted in the last 48 hours.
  * Flag matches as `IsDuplicate` and link them to the primary ticket.

### US-23: Error Recovery Handling
* **Format:** As the AI System, I want to fall back to a default severity and route if the LLM API is unavailable, so that the application does not crash during submissions.
* **Acceptance Criteria:**
  * Catch API errors and assign: `severity` = `Medium`, `department` = `PWD` (General fallback queue).
  * Add a system flag `processingError` = `true` to the database record.

### US-24: Telemetry and Latency Logging
* **Format:** As the AI System, I want to write processing latency and API token usage statistics to the database, so that developers can monitor API costs and speed performance.
* **Acceptance Criteria:**
  * Log execution time (ms) for model call and complete pipeline run.
  * Store input and output token counts for billing audit reports.

---

## 4. Future Field Officer User Stories (Post-MVP Specifications)

### US-25: Task Allocation Notifications
* **Format:** As a Field Officer, I want to receive push notifications on my field device when a critical incident is routed to my queue, so that I can dispatch crews immediately.
* **Acceptance Criteria:**
  * Trigger real-time notifications for tickets classified as `Critical` or `High`.
  * Link notification to the task detail page in the mobile UI.

### US-26: Optimized Repair Route Generation
* **Format:** As a Field Officer, I want the system to generate an optimized street route for my daily assigned maintenance tasks, so that I can save travel time and fuel.
* **Acceptance Criteria:**
  * Fetch multiple task coordinates and calculate routes using Mapbox or OpenStreetMap route engines.
  * Display route overlay on mobile map view.

### US-27: Photographic Proof of Resolution
* **Format:** As a Field Officer, I want to upload a photo of the repaired asset to resolve an incident, so that the operator and resident have visual confirmation.
* **Acceptance Criteria:**
  * Enforce photo capture via device camera (disable photo library upload for audit security).
  * Attach resolution image to the incident and transition state to `Resolved`.

### US-28: SLA Deadline Monitoring
* **Format:** As a Field Officer, I want to see a countdown timer on my active tasks based on their severity level, so that I do not miss municipal compliance deadlines.
* **Acceptance Criteria:**
  * Calculate SLA limits: Critical = 4h, High = 24h, Medium = 48h, Low = 72h.
  * Render count-down timer displaying hours and minutes remaining.

### US-29: Resident Communication Channel
* **Format:** As a Field Officer, I want to post updates or ask questions to the reporting resident via a message feed, so that I can get additional instructions.
* **Acceptance Criteria:**
  * Provide text message dialog box attached to the incident view.
  * Encrypt messages and protect resident contact numbers from direct exposure.

### US-30: Material & Resource Logging
* **Format:** As a Field Officer, I want to log the materials and labor hours used for a repair, so that my department can calculate total maintenance expenditures.
* **Acceptance Criteria:**
  * Form inputs for material types, quantities, and hours spent.
  * Validate numerical entries to prevent database input errors.

### US-31: Offline Queue Storage
* **Format:** As a Field Officer, I want to view my assigned tasks and write updates without internet connectivity, so that I can work in underground subways or poor cell signal zones.
* **Acceptance Criteria:**
  * Store task list locally using IndexDB or service worker cache.
  * Queue updates locally and sync with backend immediately when internet connection is restored.

### US-32: Work Order Dispatch
* **Format:** As a Field Officer, I want to forward a task to a different department if I arrive at a site and discover a different issue, so that we can coordinate multi-department repairs.
* **Acceptance Criteria:**
  * Enable "Forward Task" action.
  * Require choosing target department and attaching a descriptive log.
