# AI CITY Brain™: Cognitive Decision Engine Design

**Unified Orchestrator Specification**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Executive Summary & Orchestration Concept
The **AI CITY Brain™** acts as the central intelligence of the smart city operating system. Rather than routing user requests through isolated, disjointed agents, the AI CITY Brain operates as a single, unified orchestrator executing a **5-Stage Sequential Reasoning Graph**.

Internally, this graph is built using state graph concepts (implemented via LangGraph). Externally, it behaves as a single decision engine. It takes raw inputs (visual assets and text descriptions) and outputs a single, validated JSON payload that includes incident classifications, severity scores, confidence indexes, and natural language explanations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AI CITY Brain™                                │
├────────────────────────────────────────────────────────────────────────┤
│  Stage 1: Incident Understanding (Visual + Text Ingestion)             │
│       │                                                                │
│       ▼                                                                │
│  Stage 2: Severity Assessment (Objective Hazard Calculation)           │
│       │                                                                │
│       ▼                                                                │
│  Stage 3: Department Allocation (Jurisdictional Route Resolution)      │
│       │                                                                │
│       ▼                                                                │
│  Stage 4: Decision Explanation (Markdown Explainability Synthesis)     │
│       │                                                                │
│       ▼                                                                │
│  Stage 5: Decision Report Generation (Structured JSON Compilation)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stage 1: Incident Understanding

### 2.1. Purpose
Parses the incident image and description to extract visual tokens and core hazard indicators. This stage reconciles the raw inputs into a unified list of physical attributes.

### 2.2. Input
* `imageUrl` (string, Cloudinary location)
* `rawDescription` (string, resident's textual report)

### 2.3. Output
* `visualTokens` (array of strings, e.g. `["liquid_flow", "tarmac_erosion", "sinkhole_formation"]`)
* `resolvedEntity` (string, the identified core object, e.g. `water_main`)

### 2.4. Prompt Strategy
* **System Prompt:**
  ```
  You are the Visual Ingestion Node of the AI CITY Brain. Your task is to analyze the user-provided photo and text description. Extract exactly what physical objects are damaged or compromised, and identify visual risk indicators (e.g., flowing water, exposed wires, structural cracks). Return only a structured array of visual tokens and the primary resolved entity.
  ```
* **User Input Template:**
  ```json
  {
    "image": "{{imageUrl}}",
    "text": "{{rawDescription}}"
  }
  ```

---

## 3. Stage 2: Severity Assessment

### 3.1. Purpose
Evaluates the safety threat of the incident. It uses the visual tokens from Stage 1 to calculate an objective severity score.

### 3.2. Input
* `visualTokens` (array of strings)
* `rawDescription` (string)
* `locationCoordinates` (object containing latitude and longitude)

### 3.3. Output
* `calculatedSeverity` (enum: `Low`, `Medium`, `High`, `Critical`)
* `threatFactors` (array of strings explaining the hazards)

### 3.4. Prompt Strategy
* **System Prompt:**
  ```
  You are the Severity Calculator Node of the AI CITY Brain. Review the physical tokens and user text. Assess the public hazard level based on these rules:
  - CRITICAL: Immediate life threat (exposed high-voltage lines, major gas leaks, structural collapse near traffic).
  - HIGH: Major utility outage or structural damage obstructing public roads (burst water main, sinkhole, fallen trees blocking highways).
  - MEDIUM: Moderate damage with localized inconvenience (minor potholes, broken street lights, missed trash pile).
  - LOW: Aesthetic or minor issues (graffiti, overgrown grass).
  
  Format the output as a severity rating accompanied by a list of identified threat factors.
  ```

---

## 4. Stage 3: Department Allocation

### 4.1. Purpose
Determines the municipal department responsible for addressing the incident. It calculates an allocation confidence score based on the category and jurisdiction.

### 4.2. Input
* `resolvedEntity` (string)
* `visualTokens` (array of strings)
* `calculatedSeverity` (string)

### 4.3. Output
* `assignedDepartment` (enum: `PWD`, `ELECTRICITY`, `WATER_BOARD`, `SANITATION`)
* `allocationConfidence` (float, `0.00` to `1.00`)

### 4.4. Prompt Strategy
* **System Prompt:**
  ```
  You are the Municipal Routing Node of the AI CITY Brain. Allocate the incident to the correct department based on these rules:
  - PWD (Public Works): Road repairs, pavement cracks, structural collapses, street signs, fallen trees.
  - ELECTRICITY: Power line failures, exposed wires, transformer sparkings, broken streetlights.
  - WATER_BOARD: Ruptured water pipes, clogged storm drains, sewage overflows.
  - SANITATION: Garbage accumulations, dead animal removals, illegal dumping.
  
  Evaluate the jurisdictional boundaries. Calculate your allocation confidence score (0.00 to 1.00) based on how clearly the incident fits within a single department's scope.
  ```

---

## 5. Stage 4: Decision Explanation

### 5.1. Purpose
Synthesizes the reasoning behind the severity assessment and department allocation. This stage generates the explainability report displayed to residents and operators.

### 5.2. Input
* Full context states from Stage 1, 2, and 3.

### 5.3. Output
* `reasoningReport` (string, formatted in GitHub Flavored Markdown)

### 5.4. Prompt Strategy
* **System Prompt:**
  ```
  You are the Explainable AI (XAI) engine of the AI CITY Brain. Synthesize the findings of the previous reasoning nodes. Generate a clear explanation for the resident. In your output, explain:
  1. Why this severity was selected based on the visual tokens.
  2. Why it was routed to this department.
  
  Use professional language. Write in clear markdown bullet points. Avoid internal token names or system jargon.
  ```

---

## 6. Stage 5: Decision Report Generation

### 6.1. Purpose
Compiles all resolved variables into a structured JSON payload that matches the database schemas and API specifications.

### 6.2. Input
* Outputs from all prior stages.

### 6.3. Output
* Compiles the final JSON structure for database storage.

### 6.4. Structured JSON Schema
The orchestrator enforces strict output parsing. If the LLM response fails to parse, the system triggers the retry handler.

```json
{
  "category": "WaterBurst",
  "severity": "High",
  "department": "WATER_BOARD",
  "confidence": 0.94,
  "why": [
    "Active water pool indicates subterranean asset rupture",
    "Flooding reduces vehicle traction, presenting a public road hazard",
    "Jurisdiction belongs to the Water Board due to main line rupture"
  ],
  "estimatedResolution": "24 Hours"
}
```

---

## 7. Confidence Evaluator & Human-in-the-Loop Routing
A core task of the orchestrator is evaluating its own certainty.

```
                      [ Stage 3 Allocation Completes ]
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    Confidence Assessment     │
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼ (Score >= 0.82)                       ▼ (Score < 0.82)
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │  Execute Stage 4 & 5    │             │  Route to General PWD   │
    │  Assign to target queue │             │  Flag: Manual Triage    │
    └─────────────────────────┘             └─────────────────────────┘
```

* **The Confidence Rule:**
  If the `allocationConfidence` calculated in Stage 3 is less than `0.82`:
  1. Flag the incident with `requires_manual_verification: true`.
  2. Assign the department field to `PWD` (acting as the catch-all municipal routing queue).
  3. Route the ticket directly to the **AI Operations Center Manual Triage Queue**.
  4. Skip Stage 4 explanation synthesis to minimize LLM token costs.

---

## 8. Failure Recovery & Auto-Retry Protocols
To ensure the system remains operational, the AI CITY Brain implements the following fail-safe measures:

1. **JSON Validation Failure (Recovery):**
   * If the LLM returns an invalid JSON string that violates the Zod output parser schema, the parser catches the error.
   * The orchestrator automatically sends a retry request back to the model, appending the error message and requesting a corrected structure.
2. **API Outage / Timeout (Fallback):**
   * The model call times out after 3 seconds. The system executes a maximum of 3 retries using exponential backoff.
   * If the API remains unreachable, the orchestrator triggers the emergency fallback handler:
     * `category` = `"UnclassifiedHazard"`
     * `severity` = `"Medium"`
     * `department` = `"PWD"`
     * `confidence` = `0.50`
     * `why` = `["System timed out while running AI assessment. Routed to PWD for manual inspection."] `
     * `processing_fallback` = `true`
3. **Operator Overrides (Human Override Loop):**
   * Municipal operators can override the AI's determinations.
   * If an operator overrides the department or severity:
     * The system updates the incident record.
     * It logs the change in `AdminOverrides`.
     * It sets `status = "AI_Assigned"` to `status = "In_Progress"` or custom queue targets.
     * The override details are displayed in the **AI Operations Center telemetry drawer** to help refine the model's prompts in future iterations.
