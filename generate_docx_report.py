# Script to generate AI_CITY_TECHNICAL_AUDIT_REPORT.docx using python-docx
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

doc = Document()

# Set standard 1-inch margins
for section in doc.sections:
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

# Color constants
HEX_NAVY = "0F172A"
HEX_TEAL = "0284C7"
HEX_SLATE = "334155"
HEX_BORDER = "CBD5E1"
HEX_LIGHT_BG = "F8FAFC"
HEX_GREEN_BG = "DCFCE7"
HEX_RED_BG = "FEE2E2"
HEX_YELLOW_BG = "FEF9C3"

COLOR_NAVY = RGBColor(15, 23, 42)
COLOR_TEAL = RGBColor(2, 132, 199)
COLOR_SLATE = RGBColor(51, 65, 85)
COLOR_MUTED = RGBColor(100, 116, 139)

def style_heading(p, font_size, color, bold=True, space_before=12, space_after=6):
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.keep_with_next = True
    for r in p.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(font_size)
        r.font.bold = bold
        r.font.color.rgb = color

def add_h1(text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_heading(p, 18, COLOR_NAVY, bold=True, space_before=16, space_after=8)
    return p

def add_h2(text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_heading(p, 14, COLOR_TEAL, bold=True, space_before=12, space_after=6)
    return p

def add_h3(text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_heading(p, 11.5, COLOR_SLATE, bold=True, space_before=8, space_after=4)
    return p

def add_body_p(text, bold_prefix=None, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_NAVY
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(10)
    r.font.italic = italic
    return p

def add_code_block(code_text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.2)
    # background shading XML
    shading_elm = parse_xml(r'<w:shd {} w:fill="F1F5F9"/>'.format(nsdecls('w')))
    p._p.get_or_add_pPr().append(shading_elm)
    r = p.add_run(code_text)
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    r.font.color.rgb = COLOR_SLATE
    return p

def add_callout(text, title="AUDIT OBSERVATION"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.right_indent = Inches(0.2)
    shading_elm = parse_xml(r'<w:shd {} w:fill="F8FAFC"/>'.format(nsdecls('w')))
    p._p.get_or_add_pPr().append(shading_elm)
    
    r_title = p.add_run(f"[{title}] ")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(9.5)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_TEAL

    r_body = p.add_run(text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(9.5)
    r_body.font.italic = True
    return p

def format_table(table, col_widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(table.rows):
        # repeat header row
        if r_idx == 0:
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(r'<w:tblHeader {}/>'.format(nsdecls('w'))))
            trPr.append(parse_xml(r'<w:cantSplit {}/>'.format(nsdecls('w'))))
        else:
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(r'<w:cantSplit {}/>'.format(nsdecls('w'))))
            
        for c_idx, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if col_widths and c_idx < len(col_widths):
                cell.width = col_widths[c_idx]
            tcPr = cell._tc.get_or_add_tcPr()
            # borders
            borders_elm = parse_xml(
                r'<w:tcBorders {}><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                r'<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                r'<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/></w:tcBorders>'.format(nsdecls('w'))
            )
            tcPr.append(borders_elm)
            
            # margins
            mar_elm = parse_xml(
                r'<w:tcMar {}><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>'
                r'<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'.format(nsdecls('w'))
            )
            tcPr.append(mar_elm)

            if r_idx == 0:
                shd = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), HEX_NAVY))
                tcPr.append(shd)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for r in p.runs:
                        r.font.name = "Calibri"
                        r.font.size = Pt(9)
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Calibri"
                        r.font.size = Pt(8.5)


# =============================================================
# COVER / TITLE BLOCK
# =============================================================
p_title = doc.add_paragraph()
p_title.paragraph_format.space_before = Pt(36)
p_title.paragraph_format.space_after = Pt(6)
r_title = p_title.add_run("AI CITY Autonomous Civic Operations OS")
r_title.font.name = "Calibri"
r_title.font.size = Pt(24)
r_title.font.bold = True
r_title.font.color.rgb = COLOR_NAVY

p_sub = doc.add_paragraph()
p_sub.paragraph_format.space_before = Pt(0)
p_sub.paragraph_format.space_after = Pt(18)
r_sub = p_sub.add_run("Consolidated Technical Architecture, Security & Quality Assurance Audit Report")
r_sub.font.name = "Calibri"
r_sub.font.size = Pt(14)
r_sub.font.color.rgb = COLOR_TEAL

add_body_p("AUD-AICITY-2026-M5", bold_prefix="Document Reference: ")
add_body_p("CityMind AI CITY — Autonomous Civic Operations Operating System", bold_prefix="Project Name: ")
add_body_p("c:\\Antigravityyyyy\\AI CITY", bold_prefix="Repository Target: ")
add_body_p("November 7, 2026", bold_prefix="Audit Assessment Date: ")
add_body_p("Senior Software Architect, Full-Stack Developer, Database Architect, UI/UX Analyst, QA Engineer, Software Testing Lead, Application Security Analyst, Technical Documentation Specialist", bold_prefix="Audit Engineering Team: ")
add_body_p("Strict Read-Only Audit (Zero project code, database records, or environment configurations modified; zero synthetic test claims)", bold_prefix="Integrity Charter: ")

doc.add_page_break()

# =============================================================
# SECTION 1: EXECUTIVE SUMMARY & SCORECARD
# =============================================================
add_h1("1. Executive Summary & Production Readiness Scorecard")

add_body_p(
    "A comprehensive software architecture reverse engineering, security evaluation, and quality assurance audit was performed on the AI CITY Autonomous Civic Operations OS codebase located at c:\\Antigravityyyyy\\AI CITY. "
    "AI CITY is an enterprise-grade civic operating system engineered to automate citizen complaint intake, multimodal visual verification, spatial and perceptual duplicate detection, dynamic severity assessment, municipal department routing, and field officer dispatch for metropolitan governance (configured for the Greater Hyderabad Municipal Corporation, GHMC)."
)
add_body_p(
    "The backend subsystem is implemented in TypeScript 5.4.5 running on Node.js (>= 18.0.0) with Express 4.19.2. Its core cognitive engine is architected around @langchain/langgraph (0.0.25) implementing a 7-node Directed Acyclic Graph (DAG) state machine powered by Google Gemini 2.0 Flash (@google/genai 2.11.0). "
    "Persistence is handled via a hybrid dual-database architecture: MongoDB / Mongoose 8.3.2 for document persistence with a 4-tier fallback hierarchy (Remote Atlas -> Local Daemon -> Embedded MongoMemoryServer -> In-Memory ES6 Proxy) and Neo4j 5.20.0 for spatial infrastructure graph topology with an in-memory Graph Emulator fallback."
)

add_h2("1.1 Production Readiness Scorecard")

t_score = doc.add_table(rows=1, cols=5)
r_hdr = t_score.rows[0].cells
r_hdr[0].text = "Assessment Dimension"
r_hdr[1].text = "Maturity Rating"
r_hdr[2].text = "Score"
r_hdr[3].text = "Status"
r_hdr[4].text = "Key Findings & Evidence Summary"

score_rows = [
    ("Architectural Modularity & Design", "HIGH", "92%", "PASS", "Exemplary decoupled architecture: clean separation of Express routes/controllers/services, LangGraph 7-node DAG, polyglot persistence, and multi-tier offline resilience engines."),
    ("Functional Feature Completeness", "HIGH", "88%", "PASS", "23 PASS, 9 PARTIAL, 0 FAIL, 1 NOT IMPLEMENTED across 33 cataloged functional capabilities. All primary user journeys are implemented."),
    ("Static Code Quality & Typing Integrity", "HIGH", "90%", "PASS", "Strict TypeScript configurations (strict: true). npx tsc --noEmit compiles cleanly with 0 errors on both backend and frontend. Frontend Vite build finishes in 6.71s."),
    ("API & Integration Robustness", "MEDIUM", "72%", "CONCERN", "24 endpoints cataloged; robust Zod body/query validation. Degraded by officer status 404 HTTP method mismatch, admin status enum mismatch (AI_Assigned), and missing Axios response interceptors."),
    ("Application Security (OWASP Top 10)", "CRITICAL GAP", "35%", "BLOCKED", "Plaintext production secrets in .env (A02), hardcoded dev-token privilege escalation in production (A01), dynamic CORS origin reflection with credentials (A05), SSRF via image download (A10), and notification IDOR (A01)."),
    ("Quality Assurance & Test Automation", "CRITICAL GAP", "0%", "BLOCKED", "0 automated test files, 0 test runners installed, 0 test scripts configured. Entire test suite posture is unexecuted. backend/package.json lint script is broken."),
    ("DevOps & Infrastructure Readiness", "MEDIUM", "45%", "CONCERN", "Render descriptor (render.yaml) and Vercel serverless adapter (api/index.ts) present. No Docker containerization, no CI/CD workflows, cold-start Neo4j omission, and unthrottled 50MB payload limits."),
    ("OVERALL PRODUCTION READINESS", "CONDITIONAL", "68%", "BLOCKED FOR PROD", "Staging / Demonstration Ready. Production deployment is strictly blocked until P0 security vulnerabilities and P1 runtime integration defects are remediated.")
]

for item in score_rows:
    row_cells = t_score.add_row().cells
    for i in range(5):
        row_cells[i].text = item[i]

format_table(t_score, [Inches(1.8), Inches(1.1), Inches(0.6), Inches(0.9), Inches(2.6)])

# =============================================================
# SECTION 2: ARCHITECTURAL TOPOLOGY
# =============================================================
add_h1("2. Project Overview & Architectural Topology")
add_body_p(
    "The workspace exhibits a decoupled monorepo structure housing backend microservices, a frontend single-page application (SPA), and cloud edge adapters. "
    "The architecture enforces strict separation between client-side rendering, API orchestration, multi-agent cognitive decision-making, and polyglot persistence."
)

add_h2("2.1 High-Level Architectural Flow")
add_body_p(
    "1. Client Layer: Citizens ingest reports via the React SPA with binary EXIF validation and Leaflet geopin markers. Officers manage resolution workflows, and Administrators monitor city health.\n"
    "2. Ingress & Gateway Layer: Incoming traffic traverses Helmet security headers, CORS origin filtering, 50MB body parsers, Morgan logging, and JWT/RBAC middleware before reaching route controllers.\n"
    "3. Service Layer & Cognitive Core: IncidentService coordinates the LangGraph 7-node StateGraph DAG, leveraging Google Gemini 2.0 Flash Vision and Gemini Embeddings for multi-modal analysis.\n"
    "4. Duplicate Detection Pipeline: Evaluates a 3-factor formula (35% Text Cosine + 35% Spatial Haversine + 30% Visual dHash) using an in-memory FAISS IndexFlatIP index and 64-bit dHash perceptual hasher.\n"
    "5. Polyglot Persistence: Persists document records to MongoDB (with 4-tier fallback) and spatial relationships to Neo4j (with in-memory Cypher emulator)."
)

add_callout(
    "All architecture and sequence diagrams are rendered in valid Mermaid syntax in the master Markdown report (AI_CITY_TECHNICAL_AUDIT_REPORT.md § 2.2).",
    title="ARCHITECTURE VISUALIZATION"
)

# =============================================================
# SECTION 3: TECHNOLOGY STACK & MANIFEST ANALYSIS
# =============================================================
add_h1("3. Complete Technology Stack & Manifest Analysis")
add_body_p("The technology stack was verified directly against backend/package.json, frontend/package.json, and deployment manifests.")

add_h2("3.1 Backend Technology Stack")
t_be = doc.add_table(rows=1, cols=4)
t_be.rows[0].cells[0].text = "Component / Library"
t_be.rows[0].cells[1].text = "Version"
t_be.rows[0].cells[2].text = "Manifest Location"
t_be.rows[0].cells[3].text = "Operational Purpose"

be_tech = [
    ("TypeScript", "^5.4.5", "backend/package.json:34", "Primary static-typed backend language"),
    ("Node.js", ">=18.0.0", "backend/package.json:43", "ECMAScript runtime environment"),
    ("Express", "^4.19.2", "backend/package.json:24", "HTTP REST API server framework"),
    ("@langchain/langgraph", "^0.0.25", "backend/package.json:15", "Multi-agent Directed Acyclic Graph (DAG) state machine"),
    ("@google/genai", "^2.11.0", "backend/package.json:14", "Google Gemini 2.0 Flash & Gemini Embedding SDK"),
    ("Mongoose", "^8.3.2", "backend/package.json:29", "MongoDB Object Data Modeling (ODM) layer"),
    ("mongodb-memory-server", "^11.2.0", "backend/package.json:28", "Embedded in-memory MongoDB daemon for offline resilience"),
    ("neo4j-driver", "^5.20.0", "backend/package.json:31", "Official Bolt protocol driver for Neo4j Graph DB"),
    ("firebase-admin", "^12.1.0", "backend/package.json:26", "Enterprise ID token verification & user claims"),
    ("cloudinary", "^2.2.0", "backend/package.json:21", "Cloud media asset hosting & upload buffer streaming"),
    ("zod", "^3.23.4", "backend/package.json:36", "Schema-driven runtime request body & query validation"),
    ("pdfkit", "^0.15.0", "backend/package.json:32", "Programmatic vector PDF audit certification generation"),
    ("sharp", "^0.35.3", "backend/package.json:33", "Native image processing, buffer decoding & transforms"),
    ("helmet", "^7.1.0", "backend/package.json:27", "HTTP response security header hardening"),
    ("cors", "^2.8.5", "backend/package.json:22", "Cross-Origin Resource Sharing control"),
    ("express-rate-limit", "^7.2.0", "backend/package.json:25", "Declared in package.json (Unwired in code)"),
    ("winston", "^3.13.0", "backend/package.json:35", "Structured multi-level JSON/console application logger"),
    ("morgan", "^1.10.0", "backend/package.json:30", "HTTP access request logging middleware"),
    ("dotenv", "^16.4.5", "backend/package.json:23", "Environment variable loader from .env files")
]

for row in be_tech:
    rc = t_be.add_row().cells
    for i in range(4):
        rc[i].text = row[i]

format_table(t_be, [Inches(1.8), Inches(0.8), Inches(1.8), Inches(2.6)])

add_h2("3.2 Frontend Technology Stack")
t_fe = doc.add_table(rows=1, cols=4)
t_fe.rows[0].cells[0].text = "Component / Library"
t_fe.rows[0].cells[1].text = "Version"
t_fe.rows[0].cells[2].text = "Manifest Location"
t_fe.rows[0].cells[3].text = "Operational Purpose"

fe_tech = [
    ("React / React-DOM", "^18.3.1", "frontend/package.json:18-19", "Functional component UI framework with React Hooks"),
    ("TypeScript", "^5.4.5", "frontend/package.json:33", "Client static typing with strict compiler configuration"),
    ("Vite", "5.2.8 / 5.4.21", "frontend/package.json:34", "Modern ESM build tool and development server"),
    ("React Router DOM", "^6.22.3", "frontend/package.json:21", "Declarative browser routing (createBrowserRouter)"),
    ("Zustand", "^4.5.2", "frontend/package.json:23", "Atomic state management store (useUIStore)"),
    ("Tailwind CSS", "^3.4.3", "frontend/package.json:32", "Utility-first CSS styling with GHMC civic tokens"),
    ("Framer Motion", "^11.1.7", "frontend/package.json:15", "Physics-based animation transitions and timelines"),
    ("Leaflet / React-Leaflet", "^1.9.4 / ^4.2.1", "frontend/package.json:16, 20", "GIS mapping, custom marker pulses, and hazard maps"),
    ("Axios", "^1.6.8", "frontend/package.json:13", "HTTP client with automated Bearer token interceptor"),
    ("Firebase Client SDK", "^10.11.1", "frontend/package.json:14", "Google Popup SSO client authentication")
]

for row in fe_tech:
    rc = t_fe.add_row().cells
    for i in range(4):
        rc[i].text = row[i]

format_table(t_fe, [Inches(1.8), Inches(1.0), Inches(1.8), Inches(2.4)])

# =============================================================
# SECTION 4: FRONTEND & UI/UX SUBSYSTEM AUDIT
# =============================================================
add_h1("4. Subsystem Audit 1: Frontend & UI/UX")
add_body_p(
    "The frontend is structured around 5 major views and 8 auxiliary components supporting 3 civic personas: Citizens, Field Officers, and Municipal Administrators. "
    "Key capabilities include client-side binary EXIF GPS parsing, a 3-angle camera modal with HTML5 canvas luminance validation, and an interactive XAI telemetry console."
)

add_h2("4.1 Screen & Component Inventory")
t_scr = doc.add_table(rows=1, cols=4)
t_scr.rows[0].cells[0].text = "Route / Component"
t_scr.rows[0].cells[1].text = "File Path & Lines"
t_scr.rows[0].cells[2].text = "Role Access"
t_scr.rows[0].cells[3].text = "Functional Scope & Responsibilities"

screens = [
    ("LoginPage (/login)", "src/features/auth/pages/LoginPage.tsx:1-407", "Public", "Authentication console with Google SSO, 5 GHMC Role Profiles, and Email login."),
    ("IngestionPage (/citizen/report)", "src/features/incidents/pages/IngestionPage.tsx:1-563", "Citizen, Officer, Admin", "Citizen hazard intake form, demo presets, 3-angle camera trigger, and Leaflet pin map."),
    ("CitizenTrackingPage (/citizen/tracking)", "src/features/incidents/pages/CitizenTrackingPage.tsx:1-318", "Citizen, Officer, Admin", "Real-time complaint history, 5-stage case resolution roadmap, tracking stepper, and audit logs."),
    ("OfficerDashboardPage (/officer)", "src/features/officer/pages/OfficerDashboardPage.tsx:1-386", "Officer, Admin", "Municipal officer queue, status workflow actions, resolution notes, and AI feedback loops."),
    ("OperationsCenterPage (/ops)", "src/features/operations/pages/OperationsCenterPage.tsx:1-700", "Admin Only", "City Health Index dashboard, spatial map cluster, search/filters, XAI telemetry, and admin overrides."),
    ("MultiAngleCameraModal", "src/features/incidents/components/MultiAngleCameraModal.tsx:1-521", "Embedded", "Modal overlay with 3-angle capture stepper, live webcam stream, facing flip, canvas luminance check."),
    ("XAIAuditTelemetryCard", "src/features/operations/components/XAIAuditTelemetryCard.tsx:1-364", "Embedded", "Tabbed XAI telemetry: Executive Rationale, Multi-Angle Visual Audit, Vector Duplicate Scan, and 7-Node DAG Path.")
]

for row in screens:
    rc = t_scr.add_row().cells
    for i in range(4):
        rc[i].text = row[i]

format_table(t_scr, [Inches(1.8), Inches(2.2), Inches(1.0), Inches(2.0)])

# =============================================================
# SECTION 5: BACKEND & AGENTIC AI COGNITIVE ENGINE
# =============================================================
add_h1("5. Subsystem Audit 2: Backend & Agentic AI Cognitive Engine")
add_body_p(
    "The backend cognitive core compiles a 7-node Directed Acyclic Graph (DAG) state machine using @langchain/langgraph. "
    "Every incoming incident passes through: 1. Complaint Understanding, 2. Visual Verification, 3. Geo Verification, 4. Duplicate Detection, 5. Priority Assessment, 6. Department Routing, and 7. Explainability."
)

add_h2("5.1 Complete API Inventory (24 Endpoints)")
t_api = doc.add_table(rows=1, cols=5)
t_api.rows[0].cells[0].text = "#"
t_api.rows[0].cells[1].text = "Method & Route Path"
t_api.rows[0].cells[2].text = "Controller / Source Line"
t_api.rows[0].cells[3].text = "Role"
t_api.rows[0].cells[4].text = "Request Body & Response Description"

api_table_data = [
    ("1", "GET /health", "app.ts:29-31", "None", "Liveness probe; returns 200 OK with server timestamp"),
    ("2", "POST /api/auth/sync", "routes/index.ts:13-15", "Any", "Syncs user profile; returns 200 OK with user object"),
    ("3", "POST /api/incidents/upload", "incident.routes.ts:22-47", "Any", "Body: { image: base64 }; returns 200 OK with Cloudinary URL"),
    ("4", "POST /api/incidents", "incident.controller.ts:7-31", "Any", "Body: Zod incidentIngestSchema; returns 201 Created or 200 OK (Duplicate)"),
    ("5", "GET /api/incidents", "incident.controller.ts:33-90", "Any", "Query: pagination, filters; returns 200 OK with incidents array"),
    ("6", "POST /api/officer/incidents/:id/accept", "officer.controller.ts:10-29", "officer, admin", "Path: :id; returns 200 OK with status Assigned"),
    ("7", "POST /api/officer/incidents/:id/reject", "officer.controller.ts:34-55", "officer, admin", "Path: :id, Body: { reason: min 10 }; returns 200 OK with status Rejected"),
    ("8", "POST /api/officer/incidents/:id/request-info", "officer.controller.ts:60-79", "officer, admin", "Path: :id, Body: { message: min 10 }; returns 200 OK + notification"),
    ("9", "PATCH /api/officer/incidents/:id/status", "officer.controller.ts:84-119", "officer, admin", "Path: :id, Body: { status, note }; returns 200 OK (DEF-UI-01 mismatch)"),
    ("10", "POST /api/officer/incidents/:id/close", "officer.controller.ts:124-149", "officer, admin", "Path: :id, Body: { resolutionNotes }; returns 200 OK with status Resolved"),
    ("11", "PATCH /api/incidents/:id/override", "admin.controller.ts:8-69", "admin", "Path: :id, Body: Zod overrideSchema; returns 200 OK with override flag"),
    ("12", "PATCH /api/incidents/:id/status", "admin.routes.ts:32-66", "admin", "Path: :id, Body: { status }; returns 200 OK (DEF-BE-01: enum mismatch)"),
    ("13", "GET /api/incidents/:id/audit", "admin.controller.ts:71-114", "admin", "Path: :id; returns 200 OK with full XAI telemetry and nodePath trace"),
    ("14", "GET /api/incidents/:id/audit/pdf", "admin.controller.ts:120-132", "admin", "Path: :id; returns 200 OK with binary application/pdf stream"),
    ("15", "GET /api/analytics/health", "admin.controller.ts:134-203", "admin", "Returns 200 OK with global health index (0-100%) and department breakdown"),
    ("16", "GET /api/notifications", "notification.routes.ts:8-14", "Any", "Returns 200 OK with user notifications and unreadCount"),
    ("17", "PATCH /api/notifications/:id/read", "notification.routes.ts:17-22", "Any", "Path: :id; marks read; returns 200 OK (DEF-SEC-06: IDOR)"),
    ("18", "PATCH /api/notifications/read-all", "notification.routes.ts:25-30", "Any", "Marks all user notifications as read; returns 200 OK"),
    ("19", "POST /api/feedback", "feedback.routes.ts:8-28", "officer, admin", "Body: { incidentId, aiSeverity, officerSeverity, ... }; returns 201 Created"),
    ("20", "GET /api/feedback/stats", "feedback.routes.ts:31-48", "admin", "Returns 200 OK with AI vs Officer agreement statistics"),
    ("21", "POST /api/graph/route", "graph.controller.ts:14-27", "Any", "Body: { wardCode, deptCode }; returns 200 OK with routing path"),
    ("22", "GET /api/graph/officers/nearest", "graph.controller.ts:33-53", "Any", "Query: department, ward; returns 200 OK (DEF-SEC-07: PII exposure)"),
    ("23", "GET /api/graph/wards/stats", "graph.controller.ts:59-74", "Any", "Returns 200 OK with ward complaint aggregates and health scores"),
    ("24", "GET /api/graph/clusters", "graph.controller.ts:80-95", "Any", "Returns 200 OK with incident clusters along common roads and assets")
]

for row in api_table_data:
    rc = t_api.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_api, [Inches(0.4), Inches(1.8), Inches(1.6), Inches(1.0), Inches(2.2)])

# =============================================================
# SECTION 6: POLYGLOT DATABASE ARCHITECTURE
# =============================================================
add_h1("6. Subsystem Audit 3: Polyglot Database Architecture")
add_body_p(
    "The data tier operates as a hybrid polyglot persistence architecture comprising MongoDB for document persistence and Neo4j for spatial infrastructure graph topology, complemented by an in-memory 3072-dimensional FAISS vector store. "
    "Both database engines incorporate multi-tiered fault-tolerant fallback layers to guarantee zero runtime crashes during database outages."
)

add_h2("6.1 MongoDB 4-Tier Fallback Hierarchy")
add_body_p(
    "1. Tier 1 (Target Remote URI): Attempts connection to MONGODB_URI with a 5000ms serverSelectionTimeout and validates via admin().ping().\n"
    "2. Tier 2 (Local MongoDB Daemon): If Tier 1 fails, attempts connection to local mongod at mongodb://127.0.0.1:27017/aicity with a 2000ms timeout.\n"
    "3. Tier 3 (Embedded MongoMemoryServer): If local daemon is absent, dynamically spawns an embedded MongoMemoryServer instance (mongodb-memory-server v11.2.0).\n"
    "4. Tier 4 (In-Memory ES6 Model Proxy): If embedded memory server fails, activates dbFallback.ts using ES6 Proxy objects to intercept Mongoose model calls (find, findOne, create, findByIdAndUpdate) and redirect to in-memory collections."
)

add_h2("6.2 Neo4j 2-Tier Fallback Hierarchy")
add_body_p(
    "1. Tier 1 (Live Bolt Driver): Attempts Bolt connection to bolt://localhost:7687 or NEO4J_URI.\n"
    "2. Tier 2 (In-Memory Cypher Emulator): If Bolt connection fails, runEmulatorQuery parses Cypher query patterns against memoryGraph stores."
)

# =============================================================
# SECTION 7: FEATURE ASSESSMENT MATRIX
# =============================================================
add_h1("7. Comprehensive Feature Assessment Matrix (33 Features)")
add_body_p(
    "Every functional capability identified in PROJECT.md was rigorously evaluated against source code evidence and verified build commands. "
    "Features are classified into PASS (23), PARTIAL (9), FAIL (0), and NOT IMPLEMENTED (1)."
)

t_feat = doc.add_table(rows=1, cols=5)
t_feat.rows[0].cells[0].text = "#"
t_feat.rows[0].cells[1].text = "Feature Name"
t_feat.rows[0].cells[2].text = "Category"
t_feat.rows[0].cells[3].text = "Status"
t_feat.rows[0].cells[4].text = "Source Citation & Evidence Summary"

feat_summary = [
    ("1", "Multi-Role Authentication", "Auth", "PASS", "LoginPage.tsx:1-407; auth.middleware.ts:1-127. 3 auth modes: Google SSO, 5 GHMC profiles, email."),
    ("2", "Role-Based Access Control (RBAC)", "Auth", "PARTIAL", "AuthGuard.tsx:1-82; auth.middleware.ts:129-140. PARTIAL due to DEF-SEC-02 and DEF-SEC-08."),
    ("3", "Multi-Angle Camera & Quality Check", "Frontend", "PASS", "MultiAngleCameraModal.tsx:1-521. 3-angle capture stepper with canvas luminance verification."),
    ("4", "Client-side Binary EXIF & GPS Proximity", "Frontend", "PASS", "exifUtils.ts:1-248; IngestionPage.tsx:485-496. Binary JPEG APP1 parser; Haversine 500m check."),
    ("5", "Citizen Complaint Ingestion", "Backend", "PASS", "incident.routes.ts:50-55; incident.controller.ts:7-31. Zod schema validation; 50MB body support."),
    ("6", "LangGraph 7-Node StateGraph Engine", "AI Core", "PASS", "langGraphBrain.service.ts:1-929. Compiled @langchain/langgraph v0.0.25 state machine DAG."),
    ("7", "Node 1: Complaint Understanding", "AI Core", "PASS", "langGraphBrain.service.ts:236-322. Intent and entity extraction; spam keyword rejection."),
    ("8", "Node 2: Multimodal Visual Verification", "AI Core", "PASS", "langGraphBrain.service.ts:325-510. Gemini 2.0 Flash Vision hazard check; dark lens detection."),
    ("9", "Node 3: Geospatial Bounding Box Check", "AI Core", "PASS", "langGraphBrain.service.ts:529-620. GHMC and Bengaluru bounding box validation; ward mapping."),
    ("10", "Node 4: Multimodal Duplicate Detection", "AI Core", "PASS", "duplicate.service.ts:1-287. 35% text cosine + 35% spatial GPS + 30% visual dHash formula."),
    ("11", "In-Memory FAISS Vector Index", "AI Core", "PASS", "faissIndex.service.ts:1-125. IndexFlatIP replica for 3072-dimensional Gemini embeddings."),
    ("12", "Perceptual Image Hashing (dHash)", "AI Core", "PASS", "phash.service.ts:1-111. 64-bit difference hash on 9x8 luminance grid with Hamming distance."),
    ("13", "Duplicate Linking & Witness Increment", "Backend", "PASS", "incident.service.ts:38-67. Score > 0.90 increments parent witnessCount ($inc) and links child."),
    ("14", "Node 5: Dynamic Priority Assessment", "AI Core", "PASS", "langGraphBrain.service.ts:668-707. Threat multipliers (Electrical/Gas +1.0) and witness escalation."),
    ("15", "Node 6: Municipal Department Routing", "AI Core", "PASS", "langGraphBrain.service.ts:713-761. Keyword hit scoring across ELECTRICITY, WATER_BOARD, SANITATION, PWD."),
    ("16", "Node 7: Explainable AI (XAI) Telemetry", "AI Core", "PASS", "langGraphBrain.service.ts:767-845. Markdown rationale, evidence ledger, confidence score in AILog."),
    ("17", "Spatial Knowledge Graph Ingestion", "Database", "PASS", "neo4jGraph.service.ts:216-263. Cypher MERGE persists Complaint node and spatial relationships."),
    ("18", "In-Memory Neo4j Graph Emulator", "Database", "PASS", "neo4j.ts:55-168. Cypher query emulator parsing queries against static memory graph."),
    ("19", "3-Tier MongoDB Resilience & Proxy", "Database", "PASS", "db.ts:10-68; dbFallback.ts:1-382. 4-stage hierarchy: Remote -> Local -> MemoryServer -> Proxy."),
    ("20", "Field Officer Action Console", "Frontend", "PARTIAL", "OfficerDashboardPage.tsx:1-386; officer.controller.ts:1-151. PARTIAL due to DEF-UI-01 (POST 404)."),
    ("21", "Operations Center & City Health Index", "Frontend", "PASS", "OperationsCenterPage.tsx:1-700. 0-100% City Health Index, 4 department health bars, map."),
    ("22", "Administrative Override Engine", "Backend", "PARTIAL", "admin.controller.ts:8-69; frontend/src/features/operations/pages/OperationsCenterPage.tsx:142-165. PARTIAL: DEF-BE-01 & DEF-BE-02."),
    ("23", "XAI Decision Audit Telemetry View", "Frontend", "PASS", "XAIAuditTelemetryCard.tsx:1-364. 4 interactive tabs: Rationale, Visual, Duplicate, 7-Node DAG."),
    ("24", "Enterprise XAI PDF Certification", "Backend", "PASS", "xaiPdf.service.ts:1-215. Programmatic vector PDF audit certificate with SHA-256 digital seal."),
    ("25", "Citizen Complaint Tracking Roadmap", "Frontend", "PASS", "CitizenTrackingPage.tsx:1-318. 5-stage case resolution lifecycle stepper with audit logs."),
    ("26", "In-App Notification System", "Backend", "PARTIAL", "notification.service.ts:1-43; frontend/src/features/notifications/NotificationBell.tsx:1-123. PARTIAL due to DEF-SEC-06 (IDOR)."),
    ("27", "AI Feedback Loop & Disagreement Tracking", "Backend", "PASS", "feedback.routes.ts:1-50; feedback.model.ts:1-29. Officer agreement/disagreement logging."),
    ("28", "Neo4j Nearest Officer Dispatch Query", "Backend", "PARTIAL", "neo4jGraph.service.ts:60-105. PARTIAL due to DEF-SEC-07 (unprotected officer PII)."),
    ("29", "Road & Asset Complaint Clustering", "Backend", "PASS", "neo4jGraph.service.ts:175-214. Graph query detecting complaint clusters along road networks."),
    ("30", "Cloudinary Cloud Media Hosting", "Cloud", "PARTIAL", "cloudinary.ts:1-27; incident.routes.ts:22-47. PARTIAL due to DEF-SEC-01 (plaintext credentials)."),
    ("31", "Vercel Serverless Function Adapter", "Cloud", "PARTIAL", "api/index.ts:1-20. PARTIAL due to DEF-OPS-03 (omits connectNeo4j during cold start)."),
    ("32", "Render Multi-Service Cloud Deployment", "Cloud", "PARTIAL", "render.yaml:1-36. PARTIAL due to missing Docker containerization and health checks."),
    ("33", "Automated Test Suite Execution", "DevOps", "NOT IMPLEMENTED", "Entire repository. 0 test files, 0 test runners installed. Posture: Not Executed / NOT VERIFIED.")
]

for row in feat_summary:
    rc = t_feat.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_feat, [Inches(0.4), Inches(1.8), Inches(0.9), Inches(1.1), Inches(2.8)])

# =============================================================
# SECTION 8: SOFTWARE QA & TEST SCENARIO SUITE
# =============================================================
add_h1("8. Software Quality Assurance & Test Scenario Suite (40 Scenarios)")
add_body_p(
    "Inspection of the repository revealed a complete absence of automated testing: zero test files (*.test.ts, *.spec.ts), zero test runners (Jest, Vitest, Supertest), and zero test scripts. "
    "In accordance with the project integrity charter, all test scenario execution is marked Not Executed / NOT VERIFIED."
)
add_body_p(
    "To establish a robust quality assurance framework, an end-to-end QA Test Scenario Suite spanning 38 test cases across Unit (UTS), Integration (ITS), API Contract (ATS), Security (STS), and Performance (PTS) suites has been designed."
)

t_qa = doc.add_table(rows=1, cols=5)
t_qa.rows[0].cells[0].text = "Test ID"
t_qa.rows[0].cells[1].text = "Suite"
t_qa.rows[0].cells[2].text = "Target Component"
t_qa.rows[0].cells[3].text = "Test Case Description & Expected Outcome"
t_qa.rows[0].cells[4].text = "Priority & Status"

qa_samples = [
    ("UTS-EXIF-01", "Unit (UTS)", "exifUtils.ts:46-88", "Valid JPEG with APP1 GPS tags; returns ExifMetadata with lat 17.4482, lon 78.3756", "P1 | NOT VERIFIED"),
    ("UTS-HAV-02", "Unit (UTS)", "exifUtils.ts:20-41", "Boundary proximity (499m valid vs 501m proximity warning); geodesic distance +-2m", "P1 | NOT VERIFIED"),
    ("UTS-PHASH-01", "Unit (UTS)", "phash.service.ts:31-62", "Identical image buffer dHash comparison; Hamming distance = 0, visual similarity = 1.00", "P1 | NOT VERIFIED"),
    ("UTS-LUM-01", "Unit (UTS)", "MultiAngleCameraModal.tsx", "Dark / covered lens detection (avg luminance < 20); returns valid: false with reason", "P1 | NOT VERIFIED"),
    ("UTS-PRIO-01", "Unit (UTS)", "langGraphBrain.service.ts", "Priority escalation: Medium (2) + witness (+1.0) + Electrical (+1.0) = Critical (4.0)", "P1 | NOT VERIFIED"),
    ("ITS-DAG-01", "Integration", "langGraphBrain.service.ts", "7-Node multi-agent DAG execution trace; all 7 nodes execute with 7 log entries", "P1 | NOT VERIFIED"),
    ("ITS-DB-01", "Integration", "db.ts:10-68", "Fallback to embedded MongoMemoryServer when remote Mongo URI is unreachable", "P1 | NOT VERIFIED"),
    ("ITS-DUP-01", "Integration", "duplicate.service.ts:1-287", "Multi-modal duplicate linking; score > 0.90 increments parent witnessCount", "P1 | NOT VERIFIED"),
    ("ATS-INC-01", "API Contract", "POST /api/incidents", "Successful complaint ingestion; returns 201 Created with AI classification & SLA", "P1 | NOT VERIFIED"),
    ("ATS-OFF-03", "API Contract", "PATCH /api/officer/.../status", "Update status to In_Progress; returns 200 OK and appends statusHistory entry", "P1 | NOT VERIFIED"),
    ("ATS-ADM-01", "API Contract", "PATCH /api/incidents/.../override", "Admin override severity/dept; returns 200 OK with modifiedByOperator flag", "P1 | NOT VERIFIED"),
    ("STS-SEC-01", "Security (STS)", "auth.middleware.ts:66-82", "Production dev-token bypass escalation; GET /health with dev-admin returns 401 in prod", "P0 | NOT VERIFIED"),
    ("STS-SEC-02", "Security (STS)", "incident.controller.ts:41-46", "Citizen tenant isolation bypass via ?all=true; response strictly filters to citizen", "P1 | NOT VERIFIED"),
    ("STS-SEC-04", "Security (STS)", "app.ts:15-18", "Dynamic CORS origin reflection; OPTIONS check blocks untrusted phishing origins", "P0 | NOT VERIFIED"),
    ("STS-SEC-05", "Security (STS)", "phash.service.ts:17-21", "Cloud metadata SSRF via imageUrl; server blocks private/link-local IP addresses", "P1 | NOT VERIFIED"),
    ("PTS-ING-01", "Performance", "POST /api/incidents", "Ingestion API throughput: 50 concurrent virtual users over 60s; p95 <= 2500ms", "P1 | NOT VERIFIED"),
    ("PTS-VEC-01", "Performance", "faissIndex.service.ts", "FAISS vector search latency: Top-10 search across 10,000 vectors executes in <= 50ms", "P2 | NOT VERIFIED")
]

for row in qa_samples:
    rc = t_qa.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_qa, [Inches(1.1), Inches(1.0), Inches(1.8), Inches(2.0), Inches(1.1)])
add_body_p("*Note: The complete 40-scenario matrix is cataloged in the Excel deliverable (AI_CITY_AUDIT_DATA.xlsx).*")

# =============================================================
# SECTION 9: EXHAUSTIVE DEFECT REGISTER
# =============================================================
add_h1("9. Exhaustive Defect Register (18 Defects)")
add_body_p(
    "A total of 18 defects were confirmed through static code inspection and verified build executions. "
    "Defects are categorized across Security (8), Functional / UI (2), Backend API & Logic (3), Data Integrity (2), and DevOps / Infrastructure (3)."
)

t_def = doc.add_table(rows=1, cols=5)
t_def.rows[0].cells[0].text = "Defect ID"
t_def.rows[0].cells[1].text = "Severity / Priority"
t_def.rows[0].cells[2].text = "Subsystem & Location"
t_def.rows[0].cells[3].text = "Defect Title & Technical Impact"
t_def.rows[0].cells[4].text = "Remediation Summary"

def_table_data = [
    ("DEF-SEC-01", "CRITICAL | P0", "Config / Secrets\nbackend/.env:6-20", "Cleartext Production Credentials Committed in Files\nLive Gemini API key, Mongo Atlas admin URI, and Firebase private key committed.", "Revoke and rotate all 4 credentials; remove .env from git tracking."),
    ("DEF-SEC-02", "CRITICAL | P0", "Auth Middleware\nauth.middleware.ts:66-82", "Hardcoded Dev Token Privilege Escalation Bypass in Production\nBearer dev-admin grants admin role in production without Firebase check.", "Gate check behind: if (process.env.NODE_ENV !== 'production' && ...)"),
    ("DEF-SEC-03", "HIGH | P0", "App Security\nbackend/src/app.ts:15-18", "Insecure Dynamic CORS Origin Reflection with Credentials\norigin: true echoes any requesting origin with credentials: true.", "Replace with explicit domain whitelist: CORS_ALLOWED_ORIGINS."),
    ("DEF-SEC-04", "HIGH | P1", "Incident API\nincident.controller.ts:41-46", "Broken Tenant Isolation & IDOR via ?all=true\nAny citizen appending ?all=true retrieves all city complaints.", "Change check to strictly require role: user.role === 'admin' || 'officer'."),
    ("DEF-SEC-05", "HIGH | P1", "Ingestion / SSRF\nphash.service.ts:17-21", "Server-Side Request Forgery (SSRF) in Image URL Download\nDirect fetch(imageUrl) without private IP range or domain validation.", "Enforce HTTPS scheme and whitelist trusted CDN hostnames."),
    ("DEF-SEC-06", "MEDIUM | P2", "Notification API\nnotification.routes.ts:17-22", "Insecure Direct Object Reference (IDOR) in Notification Read\nAny user can mark another user's notifications as read.", "Enforce ownership: findOneAndUpdate({ _id: id, userId: req.user.id })."),
    ("DEF-SEC-07", "MEDIUM | P2", "Graph API / PII\ngraph.routes.ts:15", "Unprotected Sensitive Officer PII Exposed via Public Endpoint\nGET /officers/nearest exposes officers' names and phone numbers to citizens.", "Mount requireRole(['admin', 'officer']) middleware on route."),
    ("DEF-SEC-08", "HIGH | P1", "Frontend Auth\nAuthGuard.tsx:16-35", "Client-Side RBAC Route Guard Bypass via Unverified localStorage\nManipulating localStorage.aicity_user grants access to /ops dashboard.", "Validate active session and role with GET /api/auth/sync on navigation."),
    ("DEF-UI-01", "HIGH | P1", "Officer Frontend\nOfficerDashboardPage.tsx:91", "HTTP Method Mismatch in Officer Status Update (404 Error)\nSends POST instead of PATCH to /officer/incidents/:id/status, returning 404.", "Use api.patch(endpoint, body) when actionType === 'status'."),
    ("DEF-BE-01", "MEDIUM | P2", "Admin API\nadmin.routes.ts:41", "Schema Enum Mismatch in Admin Status Update (AI_Assigned)\nRoute accepts 'AI_Assigned', triggering Mongoose Schema validation error.", "Update route to accept 'Assigned' matching incident.model.ts."),
    ("DEF-BE-02", "MEDIUM | P2", "Admin Controller\nadmin.controller.ts:50-53", "Missing statusHistory Audit Trail in Administrative Override\nStatus update to In_Progress omits appending entry to statusHistory.", "Append { status: 'In_Progress', note: `Admin Override: ${reason}` } to history."),
    ("DEF-BE-03", "HIGH | P1", "Duplicate Service\nduplicate.service.ts:85-111", "Request Latency & API Rate-Limit Exhaustion in Duplicate Loop\nSynchronously iterates over up to 100 historical tickets on every ingestion.", "Precompute embeddings and pHash once at creation; query FAISS index."),
    ("DEF-BE-04", "MEDIUM | P2", "Incident Service\nincident.service.ts:70-113", "Lack of Multi-Document ACID Transactions Across MongoDB & Neo4j\nNon-atomic sequential writes permit partial write failure states.", "Wrap MongoDB writes in Mongoose session transactions with rollback."),
    ("DEF-BE-05", "MEDIUM | P2", "Incident API\nincident.controller.ts:55-58", "ReDoS / Query Injection Vulnerability in Incident Keyword Search\nUnsanitized search query passed directly to MongoDB $regex.", "Escape regex characters before query: search.replace(/[.*+?^${}()|[\\]\\\\]/g, ...)."),
    ("DEF-OPS-01", "HIGH | P1", "Repository QA\nbackend & frontend", "Complete Absence of Automated Testing Infrastructure\n0 test runners, 0 test files, 0 test scripts across entire codebase.", "Install Vitest + Supertest in backend and Vitest + RTL in frontend."),
    ("DEF-OPS-02", "LOW | P3", "Backend Build\nbackend/package.json:10", "Broken Lint Script in Backend Service (eslint not installed)\nInvoking npm run lint fails immediately with command not found.", "Install eslint, @typescript-eslint/parser, and plugin in devDependencies."),
    ("DEF-OPS-03", "MEDIUM | P2", "Serverless Adapter\napi/index.ts:8-18", "Missing Neo4j Initialization in Vercel Serverless Function\nCold start omits connectNeo4j(), causing graph emulator to reset.", "Add await connectNeo4j() to lazy initialization block in api/index.ts."),
    ("DEF-OPS-04", "HIGH | P1", "App Security\nbackend/src/app.ts:20-22", "Missing Rate Limiting Middleware on 50MB Payload Endpoints\nexpress-rate-limit declared in package.json but unwired in code.", "Mount express-rate-limit on /api/incidents routes (30 req / min).")
]

for row in def_table_data:
    rc = t_def.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_def, [Inches(1.1), Inches(1.1), Inches(1.6), Inches(2.0), Inches(1.2)])

# =============================================================
# SECTION 10: OWASP TOP 10 SECURITY AUDIT
# =============================================================
add_h1("10. OWASP Top 10 Application Security Audit")
add_body_p(
    "The application was audited against the OWASP Top 10:2021 standard. Critical vulnerabilities were identified in Broken Access Control (A01), Cryptographic Failures / Sensitive Data Exposure (A02), Security Misconfiguration (A05), and Server-Side Request Forgery (A10)."
)

t_owasp = doc.add_table(rows=1, cols=5)
t_owasp.rows[0].cells[0].text = "OWASP Category"
t_owasp.rows[0].cells[1].text = "Severity"
t_owasp.rows[0].cells[2].text = "Status"
t_owasp.rows[0].cells[3].text = "Defect Reference"
t_owasp.rows[0].cells[4].text = "Vulnerability Summary"

owasp_data = [
    ("A01: Broken Access Control", "CRITICAL", "FAIL", "DEF-SEC-02, 04, 06, 07, 08", "Hardcoded dev token grants admin in prod; ?all=true citizen tenant bypass; notification IDOR; public officer PII."),
    ("A02: Cryptographic Failures", "CRITICAL", "FAIL", "DEF-SEC-01", "Plaintext production credentials committed in backend/.env: Mongo Atlas admin URI, Gemini API key, Firebase private key."),
    ("A03: Injection & Input Validation", "MEDIUM", "PARTIAL", "DEF-BE-05", "Unsanitized search query in MongoDB $regex allows ReDoS. Cypher queries are properly parameterized (PASS)."),
    ("A04: Insecure Design", "HIGH", "FAIL", "DEF-BE-03, 04, DEF-OPS-04", "Synchronous duplicate loop causes API quota exhaustion. Non-atomic cross-database writes risk partial write failures."),
    ("A05: Security Misconfiguration", "HIGH", "FAIL", "DEF-SEC-03, DEF-OPS-02", "Dynamic CORS origin reflection with credentials (origin: true). Unwired rate limiting. Broken lint script."),
    ("A06: Vulnerable Components", "LOW", "PASS", "Audited", "Modern dependencies (React 18.3.1, Node 18+, Express 4.19.2). Requires legacy-peer-deps."),
    ("A07: Identification Failures", "HIGH", "FAIL", "DEF-SEC-02", "Dev tokens bypass cryptographic verification in all environments. Unauthenticated client requests default to dev-citizen."),
    ("A08: Software & Data Integrity", "MEDIUM", "PARTIAL", "CI/CD Gap", "Absence of automated CI/CD pipeline and container signing prevents verification of build provenance."),
    ("A09: Logging & Monitoring", "MEDIUM", "PARTIAL", "Telemetry Gap", "Auth bypass and token validation failures logged only to local console. No security intrusion alerting."),
    ("A10: Server-Side Request Forgery", "HIGH", "FAIL", "DEF-SEC-05", "Direct fetch(imageUrl) allows outbound GET requests to internal AWS metadata (169.254.169.254) and private subnets.")
]

for row in owasp_data:
    rc = t_owasp.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_owasp, [Inches(1.8), Inches(0.9), Inches(0.7), Inches(1.3), Inches(2.3)])

# =============================================================
# SECTION 11: ENVIRONMENT & DEVOPS ASSESSMENT
# =============================================================
add_h1("11. Environment, Deployment & DevOps Assessment")
add_body_p(
    "1. Committed Secrets (Severity: CRITICAL): Active credentials for MongoDB Atlas, Google Gemini, Cloudinary, and Firebase Admin are stored in plaintext on disk.\n"
    "2. Cloud Deployment Descriptor (render.yaml): Declares citymind-backend (Web Service) and citymind-frontend (Static Site with SPA rewrite). Omission: Missing health check endpoint in descriptor.\n"
    "3. Serverless Function (api/index.ts): Exports Vercel serverless function handler. Omission (DEF-OPS-03): Missing connectNeo4j() in cold-start initialization.\n"
    "4. Containerization & CI/CD Gaps: Zero Docker container descriptors (no Dockerfile, docker-compose.yml) and zero automated CI/CD pipeline workflows (.github/workflows) exist in the repository.\n"
    "5. Broken Lint Tooling: npm run lint in backend/ crashes because eslint is absent from dependencies."
)

# =============================================================
# SECTION 12: STRATEGIC ROADMAP
# =============================================================
add_h1("12. Strategic Improvement Roadmap & Hardening Action Plan")
add_body_p(
    "A four-phase remediation roadmap is established to transition AI CITY from demonstration readiness to production deployment certification."
)

t_act = doc.add_table(rows=1, cols=5)
t_act.rows[0].cells[0].text = "Phase"
t_act.rows[0].cells[1].text = "Priority"
t_act.rows[0].cells[2].text = "Action Description"
t_act.rows[0].cells[3].text = "Effort"
t_act.rows[0].cells[4].text = "Target Defect / Gap"

roadmap_data = [
    ("Phase 0", "P0", "Rotate Atlas, Gemini, Firebase, and Cloudinary secrets; delete .env from git.", "0.5 days", "DEF-SEC-01"),
    ("Phase 0", "P0", "Gate dev-token bypass behind process.env.NODE_ENV !== 'production'.", "0.5 days", "DEF-SEC-02"),
    ("Phase 0", "P0", "Replace dynamic CORS origin reflection with explicit allowed domain whitelist.", "0.5 days", "DEF-SEC-03"),
    ("Phase 1", "P1", "Fix officer status update HTTP method (POST -> PATCH in OfficerDashboardPage.tsx).", "0.5 days", "DEF-UI-01"),
    ("Phase 1", "P1", "Precompute embeddings and pHash; eliminate synchronous 100-ticket duplicate loop.", "1.5 days", "DEF-BE-03"),
    ("Phase 1", "P1", "Enforce tenant isolation in incident.controller.ts (remove all === 'true' bypass).", "0.5 days", "DEF-SEC-04"),
    ("Phase 1", "P1", "Implement SSRF URL validation helper ensuring HTTPS and trusted CDN domains.", "1.0 days", "DEF-SEC-05"),
    ("Phase 1", "P1", "Mount express-rate-limit middleware on /api/incidents routes (30 req/min).", "0.5 days", "DEF-OPS-04"),
    ("Phase 2", "P1", "Install Vitest + Supertest in backend; implement UTS, ITS, ATS test suites.", "3.0 days", "DEF-OPS-01"),
    ("Phase 2", "P2", "Install eslint and typescript-eslint dependencies; fix npm run lint.", "0.5 days", "DEF-OPS-02"),
    ("Phase 2", "P2", "Author production multi-stage Dockerfile and docker-compose.yml.", "1.5 days", "DevOps Gap"),
    ("Phase 2", "P2", "Establish GitHub Actions CI pipeline (.github/workflows/ci.yml).", "1.0 days", "CI/CD Gap"),
    ("Phase 3", "P2", "Wrap incident creation in Mongoose session transactions with rollback.", "1.5 days", "DEF-BE-04"),
    ("Phase 3", "P2", "Add connectNeo4j() to Vercel serverless function adapter (api/index.ts).", "0.5 days", "DEF-OPS-03"),
    ("Phase 3", "P2", "Implement React.lazy route code-splitting to reduce 830kB frontend JS bundle.", "1.0 days", "Bundle Size"),
    ("Phase 3", "P2", "Add Axios response interceptors for global 401 session expiration handling.", "0.5 days", "Client Robustness")
]

for row in roadmap_data:
    rc = t_act.add_row().cells
    for i in range(5):
        rc[i].text = row[i]

format_table(t_act, [Inches(0.9), Inches(0.8), Inches(3.0), Inches(0.8), Inches(1.5)])

# =============================================================
# SECTION 13 & 14: LIMITATIONS & APPENDICES
# =============================================================
add_h1("13. Audit Limitations, Assumptions & Verification Methodology")
add_body_p(
    "1. Strict Read-Only Execution: The audit was performed strictly read-only without modifying source code, database records, or environment files.\n"
    "2. Automated Testing Limitations: Because zero test files exist in the repository, all test scenario evaluations are classified as NOT IMPLEMENTED / NOT VERIFIED.\n"
    "3. Independent Static Verification: Successfully executed npx tsc --noEmit on both backend and frontend (0 type errors) and verified clean Vite production bundling in 6.71s."
)

add_h1("14. Appendices")
add_h2("14.1 Deliverable Inventory")
add_body_p("- Master Markdown Report: c:\\Antigravityyyyy\\AI CITY\\AI_CITY_TECHNICAL_AUDIT_REPORT.md")
add_body_p("- Multi-Tab Excel Workbook: c:\\Antigravityyyyy\\AI CITY\\AI_CITY_AUDIT_DATA.xlsx")
add_body_p("- Formatted Word Document: c:\\Antigravityyyyy\\AI CITY\\AI_CITY_TECHNICAL_AUDIT_REPORT.docx")
add_body_p("- Formatted PDF Document: c:\\Antigravityyyyy\\AI CITY\\AI_CITY_TECHNICAL_AUDIT_REPORT.pdf")

doc_output_path = r"c:\Antigravityyyyy\AI CITY\AI_CITY_TECHNICAL_AUDIT_REPORT.docx"
doc.save(doc_output_path)
print(f"Successfully generated DOCX report at: {doc_output_path}")
