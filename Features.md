# Feature Catalog: AI CITY

This document maps the features of the AI CITY platform. Features are classified using the **MoSCoW methodology** to align the hackathon backlog with our brand identity.

---

## 1. Feature Prioritization Table

| Feature ID | Feature Name | Priority | Description | Product & Hackathon Value | Target Release / Module | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | Multimodal Incident Ingestion | **Must Have** | User uploads an image of an infrastructure incident along with a text description. | Captures visual proof, eliminating vague descriptions. | MVP / Resident Portal | Cloudinary Storage |
| **F-02** | Geospatial Pinning | **Must Have** | Leaflet.js interactive map collects exact coordinate pins (latitude/longitude). | Pinpoints incident locations, eliminating spatial ambiguity. | MVP / Resident Portal | Leaflet Library |
| **F-03** | AI CITY Brain™ Triage | **Must Have** | Multi-agent reasoning flow (LangGraph + Gemini) to categorize and allocate incidents. | Eliminates manual sorting, reducing dispatch times from 72h to <4s. | MVP / AI CITY Brain | Gemini API |
| **F-04** | Severity Assessment Engine | **Must Have** | AI evaluates risks to calculate an urgency index (Low, Medium, High, Critical). | Prevents hazards (e.g. exposed electrical lines) from sitting in queues. | MVP / AI CITY Brain | Gemini API |
| **F-05** | AI Decision Report Card | **Must Have** | Visual panel showing severity, confidence bar, routing, estimated resolution, and bulleted reasoning. | Explains **Why** decisions were made, building trust and providing immediate feedback. | MVP / Resident Portal | Gemini API |
| **F-06** | AI Operations Center | **Must Have** | Dark-mode telemetry console displaying active incidents, spatial metrics, and live tickers. | Gives municipal leadership a high-density, real-time command screen. | MVP / Operations Center | React, Tailwind |
| **F-07** | AI Decision Audit Drawer | **Must Have** | Interactive slide-out showing prompt logs, processing latency (ms), and version control. | Allows total oversight of the AI pipeline logic. | MVP / Operations Center | Framer Motion |
| **F-08** | Firebase Authentication | **Must Have** | Simple user registry and secure login for residents and operators. | Secures the Operations Center and tracks individual submissions. | MVP / Core Infrastructure | Firebase SDK |
| **F-09** | AI Thinking Timeline | **Must Have** | Animated checklist displaying steps of AI engines processing raw data in real-time. | Visualizes the reasoning pipeline, keeping the user engaged during processing. | MVP / Resident Portal | Framer Motion |
| **F-10** | Smart Duplicate Detection | **Must Have** | Spatial check identifying similar reports within 50m in the last 48h. | Prevents duplicate work orders, saving municipal resources. | MVP / Backend Service | MongoDB Geo Index |
| **F-11** | City Health Score Panel | **Should Have** | Live widgets calculating overall and department-specific city health scores. | Provides a high-level view of municipal infrastructure stability. | MVP / Operations Center | Express API aggregation |
| **F-12** | AI Heatmap Overlay | **Should Have** | Renders Leaflet map layers with color-coded risk densities (Red/Orange/Green). | Visualizes risk density across the city at a glance. | MVP / Operations Center | Leaflet.heat |
| **F-13** | Advanced Queue Filters | **Should Have** | Filter incidents by allocation, severity, status, and creation date. | Allows operators to manage incoming incident volumes during peak periods. | MVP / Operations Center | TanStack Query |
| **F-14** | Operator Override Loop | **Could Have** | Operators can manually override AI-assigned department or severity, logging feedback. | Keeps humans in the loop for edge cases and logs model corrections. | MVP / Operations Center | Express API |
| **F-15** | Resident Incident History | **Could Have** | Personal dashboard tracking previous submissions and resolution logs. | Enhances community engagement. | MVP / Resident Portal | Firebase Auth |
| **F-16** | Mobile Dispatch App | **Future** | Dedicated lightweight app for field officers to receive and mark tasks. | Extends the platform directly to execution crews. | V2 / Operations App | React Native, GPS |
| **F-17** | Smart Waste IoT Routing | **Future** | Bin sensors trigger collection routes dynamically. | Reduces waste vehicle fuel consumption and prevents overflowing bins. | V2 / Waste Module | IoT API, Geo-routing |
| **F-18** | Traffic Signal Optimization | **Future** | AI analyzes cameras to adjust street lights based on queue lengths. | Reduces intersection wait times and emissions. | V3 / Traffic Module | Computer Vision |
| **F-19** | Automated Water Leak Detection | **Future** | Pressure sensors pinpoint pipeline leakages using acoustic analysis. | Curbs water wastage in main supply grids. | V3 / Water Module | IoT Sensors |

---

## 2. Feature Category Breakdown

### 2.1. Must Have (Required for Hackathon Launch)
These features form the minimum viable product. Without these, the platform cannot function or demonstrate the primary value proposition:
* **F-01 & F-02 (Resident Ingestion):** Input fields for image, text, and geolocation.
* **F-03, F-04 & F-10 (AI CITY Brain Core):** The LangGraph multi-agent triage system with duplicate detection.
* **F-05 & F-09 (Citizen Feedback):** The animated AI Thinking Timeline and the explainable AI Decision Report Card.
* **F-06 & F-07 (Operations Center):** High-density admin control room and AI audit drawer.
* **F-08 (Security):** Firebase identity validator.

### 2.2. Should Have (Targeted for Pitch Demo)
These features add visual polish to impress judges during the pitch:
* **F-11 (City Health Scores):** Aggregated metrics (City Health, Road, Water, Electricity health percentages).
* **F-12 (AI Heatmap):** Pulsing risk overlays on the map.
* **F-13 (Filters):** Operator control panel utilities.

### 2.3. Could Have (Secondary Enhancements)
* **F-14 (Human-in-the-Loop Override):** Allows manual changes to AI decisions, logging justifications.
* **F-15 (Resident History):** Citizen tracking log.

### 2.4. Future (Roadmap Modules)
* **F-16 (Dispatch App):** Crew dispatch.
* **F-17, F-18 & F-19 (Smart City Modules):** IoT sensors, computer vision traffic controllers, and predictive maintenance engines.
