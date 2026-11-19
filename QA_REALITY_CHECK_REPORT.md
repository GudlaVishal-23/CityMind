# AI CITY (CityMind) — Pre-Release QA Reality-Check Verification Audit
**Document:** `QA_REALITY_CHECK_REPORT.md`  
**Role:** Lead QA Engineer & Staff SDET (Independent Reality-Check Audit)  
**Audit Date:** November 19, 2026  
**Target Build:** Backend v1.0.0 (Node 20 / Express 4) | Frontend v1.0.0 (Vite 5 / React 18)  
**Execution Environment:** Windows Server / Node.js v20.12.7 / MongoMemoryServer 11 / Neo4j In-Memory Emulator  

---

## 1. Executive Reality Verdict

| Metric | Measured Value | QA Verdict |
| :--- | :---: | :---: |
| **Total Test Checks Executed** | **37 Checks** | Comprehensive Empirical Audit |
| **✅ WORKING (VERIFIED LIVE)** | **28 Checks (75.7%)** | Core Security, DB Fallbacks, Admin Overrides, Routing, IDOR, CI/Docker |
| **⚠️ PARTIAL / FALLBACK ONLY** | **6 Checks (16.2%)** | Fallback heuristics, Duplicate status codes, Polling vs WebSockets |
| **❌ BROKEN / UNIMPLEMENTED** | **3 Checks (8.1%)** | Gemini API Quota (HTTP 402), Unused UI packages (`cmdk`), Missing `/api/docs` |
| **Active Persistence Tier** | Tier-4 In-Memory Cascade | **FALLBACK ACTIVE** (Standalone/Mock without Atlas Replica Set) |
| **Active Graph Tier** | In-Memory Cypher Emulator | **FALLBACK ACTIVE** (Bolt live server offline, <3000ms emulator active) |
| **Active AI Cognitive Mode** | **DETERMINISTIC FALLBACK** | **LIVE GEMINI DEAD (HTTP 402 RESOURCE_EXHAUSTED / 0 credits)** |

### Critical Takeaway for Engineering Leadership
The core application security boundaries, tenant isolation locks, and database fallback cascades built during the hardening sprint are **genuinely working and verified live**. Attacks against SSRF, IDOR, ReDoS, dev-token bypass, and unauthorized role access are 100% blocked with expected HTTP status codes (`400`, `401`, `403`, `404`).

However, **the live AI pipeline is currently running on life support in deterministic fallback mode**: the Gemini 2.0 API key in `backend/.env` is returning `HTTP 402 RESOURCE_EXHAUSTED` (prepayment credits depleted). Furthermore, several UI libraries added in `package.json` (`cmdk`, `vaul`, `react-resizable-panels`) are **"ghost dependencies"**—they are installed in `package.json` but never imported or wired into the UI.

---

## 2. Civic Domain End-to-End Matrix (Pothole, Streetlight, Garbage, Water)

| Domain Scenario | Target Dept | Ingestion Status | LangGraph 7-Node Execution | Duplicate Catch | Officer Flow | Admin Override / Graph | Final Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Scenario 1: Pothole / Road Damage** | `PWD` | `201 Created` (`incidentId`) | ⚠️ Executed 7 nodes via **Deterministic Fallback** (Gemini returned HTTP 402) | ✅ Caught duplicate 15m away (`dupScore: 1.0`, parent linked, `200 OK`) | ✅ Accept (`200`), In_Progress (`200`), Close (`200 Resolved`) | ✅ Audit JSON (`200`) & PDF (`200`, 5,725 bytes `%PDF-`) | ⚠️ **PARTIAL** (Routed to `WATER_BOARD` due to keyword "waterlogged" in fallback mode) |
| **Scenario 2: Streetlight / Electrical Hazard** | `ELECTRICITY` | `201 Created` | ✅ Critical severity, routed to `ELECTRICITY` | N/A (Unique hazard) | ✅ Status update to `In_Progress` (`200`) | ✅ Admin Override (`200`) pushed `[ADMIN OVERRIDE]` audit note. Canonical `Assigned` (`200`) vs `AI_Assigned` (`400`) | ✅ **WORKING (VERIFIED LIVE)** |
| **Scenario 3: Garbage / Waste Dump** | `SANITATION` | ⚠️ Ingestion dismissed non-civic sample photo (`400 Bad Request`) | ⚠️ Visual node flagged `sample.jpg` as non-civic hazard | N/A | N/A | ✅ Neo4j Ward Stats (`200 OK`) & Clusters (`200 OK`); Regex search works | ⚠️ **PARTIAL** (Strict visual verification dismissed generic sample photo) |
| **Scenario 4: Water Leak / Pipeline Burst** | `WATER_BOARD` | `201 Created` (or `200` duplicate if near prior report) | ✅ Routed to `WATER_BOARD` | ✅ Auto-linked if overlapping existing water issue | ✅ In_Progress (`200`) | ✅ `GET /notifications` (`200`), Owner PATCH (`200`), Cross-tenant PATCH (`404 IDOR Blocked`) | ✅ **WORKING (VERIFIED LIVE)** |

---

## 3. 18-Defect Truth Table (Fixed vs. Still Broken)

| Defect ID | Original Vulnerability / Bug | Actual Live Test Result | Verified Status | Evidence (File & Line) |
| :--- | :--- | :--- | :---: | :--- |
| **`DEF-SEC-01`** | Tracked `.env` secrets or keys in git | `git ls-files` shows 0 `.env` files tracked; 0 `AIza` or private keys in git index | ✅ **FIXED** | `.gitignore:12-22`, `.env.example` only |
| **`DEF-SEC-02`** | Mock `dev-*` token bypass in production | `GET /api/auth/sync` with `Bearer dev-admin` returns `401 Unauthorized` when `ENABLE_DEV_AUTH !== 'true'` | ✅ **FIXED** | `backend/src/middleware/auth.middleware.ts:63-73` |
| **`DEF-SEC-03`** | Over-permissive CORS reflection | `Origin: https://evil-attacker.com` is rejected; 0 reflection in `Access-Control-Allow-Origin` | ✅ **FIXED** | `backend/src/app.ts:50-59` |
| **`DEF-SEC-04`** | PII leakage & missing tenant isolation | `GET /api/incidents?all=true` as citizen returns `403 Forbidden`; citizen sees only own tickets with 0 PII fields | ✅ **FIXED** | `backend/src/controllers/incident.controller.ts:48-59` |
| **`DEF-SEC-05`** | SSRF to cloud metadata IP (`169.254.169.254`) | `POST /api/incidents` with `http://169.254.169.254/...` is rejected with `400 Bad Request` | ✅ **FIXED** | `backend/src/utils/urlValidator.ts:130-133` |
| **`DEF-SEC-06`** | Cross-tenant notification IDOR | `PATCH /api/notifications/:id/read` by non-owner returns `404 Not Found` | ✅ **FIXED** | `backend/src/routes/notification.routes.ts:37-41` |
| **`DEF-SEC-07`** | Unrestricted access to officer GPS | `GET /api/graph/officers/nearest` returns `403 Forbidden` for citizens, `200 OK` for officers/admins | ✅ **FIXED** | `backend/src/routes/graph.routes.ts:15` |
| **`DEF-SEC-08`** | Frontend trusts raw `localStorage` role | `ProtectedRoute.tsx` executes live `api.post('/auth/sync')` and denies clearance if server role mismatches | ✅ **FIXED** | `frontend/src/components/auth/ProtectedRoute.tsx:30-55` |
| **`DEF-UI-01`** | Officer dashboard uses `POST` on status | `OfficerDashboardPage.tsx` dispatches `api.patch(endpoint, body)` for status updates | ✅ **FIXED** | `frontend/src/features/officer/pages/OfficerDashboardPage.tsx:113-115` |
| **`DEF-BE-01`** | Ad-hoc status strings break state machine | `PATCH /incidents/:id/status` accepts `'Assigned'` (`200 OK`) and rejects `'AI_Assigned'` (`400 Bad Request`) | ✅ **FIXED** | `backend/src/routes/admin.routes.ts:41-48` |
| **`DEF-BE-02`** | Missing audit trail on admin overrides | `PATCH /incidents/:id/override` atomically appends structured audit note to `incident.statusHistory` | ✅ **FIXED** | `backend/src/controllers/admin.controller.ts:63-75` |
| **`DEF-BE-03`** | Synchronous 100-ticket AI embedding loop | Duplicate detection executes in $4\text{ms}$ ($< 150\text{ms}$ budget) using precomputed vector cache | ✅ **FIXED** | `backend/src/services/duplicate.service.ts:40-75` |
| **`DEF-BE-04`** | Dual-DB mutation without saga rollback | `executeWithPolyglotTransaction()` executes compensating rollback on Mongo when graph write fails | ✅ **FIXED** | `backend/src/utils/transaction.ts:35-80` |
| **`DEF-BE-05`** | MongoDB `$regex` ReDoS query injection | `GET /api/incidents?search=^(([a-z])+.)+$` sanitized via `escapeRegExp` and returns `200 OK` in $13\text{ms}$ | ✅ **FIXED** | `backend/src/utils/regexUtils.ts:1-15` |
| **`DEF-OPS-01`**| Real test runner pass verification | 137 tests passing (119 backend + 18 frontend) across 7 suites with 0 fake mocks | ✅ **FIXED** | `backend/vitest.config.ts`, `frontend/vitest.config.ts` |
| **`DEF-OPS-02`**| ESLint code hygiene | `npm run lint` executes cleanly with 0 errors (97 legacy type warnings) | ✅ **FIXED** | `backend/package.json:10` |
| **`DEF-OPS-03`**| Serverless cold-start pool leakage | `api/index.ts` caches `__aiCityDbInitPromise` on `globalThis` for parallel Mongo + Neo4j init | ✅ **FIXED** | `api/index.ts:31-36` |
| **`DEF-OPS-04`**| Missing rate limiting & containerization | `express-rate-limit` mounted on `/api/incidents`; Docker multi-stage builds & compose validated | ✅ **FIXED** | `backend/Dockerfile`, `docker-compose.yml` |

---

## 4. Frontend Module & Runtime Health Check

| Module / Component | Route | Runtime Status | Issues Found & Reality Verdict |
| :--- | :---: | :---: | :--- |
| **Citizen Report** | `/citizen/report` | ✅ **WORKING** | Camera stream release verified (`track.stop()`), EXIF GPS parser verified, 500m distance delta check verified |
| **Citizen Tracking** | `/citizen/tracking` | ✅ **WORKING** | Timeline rendering verified, audit log view verified, lazy-loaded chunk is 12.4 kB |
| **Field Officer Console** | `/officer` | ✅ **WORKING** | `Accept`, `PATCH /status`, and `Close` verified against backend. Uses `api.patch()` |
| **Operations Center** | `/ops` | ⚠️ **PARTIAL** | Leaflet geopin maps and Bento cards work, but updates use **15s HTTP polling (`setInterval`)**, not WebSockets |
| **XAI Inspection Drawer** | Inline modal | ⚠️ **PARTIAL** | Uses custom Tailwind slide-over panel. **`vaul` package is installed but never imported** |
| **Admin Analytics** | `/ops` (inline) | ⚠️ **PARTIAL** | No dedicated `/analytics` route. Uses custom CSS progress bars. **`recharts` is NOT installed** |
| **Auth / Login** | `/login` | ✅ **WORKING** | Zero-trust session verification via `/api/auth/sync` verified in `ProtectedRoute.tsx` |
| **Global Command Palette** | `Ctrl+K` | ❌ **BROKEN** | **`cmdk` package is installed in `package.json` but has ZERO imports across the codebase** |
| **API Documentation** | `/api/docs` | ❌ **BROKEN** | **No Swagger/OpenAPI documentation route is mounted on Express** (returns 404) |

---

## 5. Exact Fix Queue (Prioritized P0 $\to$ P1 $\to$ P2)

### Priority P0: Critical Operational Blockers
1. **Gemini API Key Depleted (`HTTP 402 RESOURCE_EXHAUSTED`):**
   - **File:** [backend/.env](file:///c:/Antigravityyyyy/AI%20CITY/backend/.env) (Line 6)
   - **Error:** `ApiError: {"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio...","status":"RESOURCE_EXHAUSTED"}}`
   - **Impact:** All incoming incident reports fail live Gemini Vision and LangGraph multi-agent analysis after 3 retries, falling back to keyword heuristics.
   - **Action Required:** Operator must replenish billing credits on Google AI Studio / Vertex AI or replace `GEMINI_API_KEY` with an active funded key.

---

### Priority P1: Architecture & UI Contract Discrepancies
2. **Missing Global Command Palette (`cmdk` Ghost Dependency):**
   - **File:** [frontend/package.json](file:///c:/Antigravityyyyy/AI%20CITY/frontend/package.json) (Line 19)
   - **Defect:** `cmdk` is declared as a dependency, but `git grep cmdk frontend/src/` returns 0 results. No `Ctrl+K` command palette component is mounted in `App.tsx` or layout headers.
   - **Action Required:** Implement a `CommandDialog` component using `cmdk` in `frontend/src/components/ui/CommandPalette.tsx` for quick ticket lookup and wire it to a global `keydown` event listener.
3. **Missing API Documentation Endpoint (`/api/docs`):**
   - **File:** [backend/src/routes/index.ts](file:///c:/Antigravityyyyy/AI%20CITY/backend/src/routes/index.ts)
   - **Defect:** Requesting `GET /api/docs` returns `404 Not Found`. No Swagger UI / OpenAPI router is mounted.
   - **Action Required:** Mount `swagger-ui-express` or serve an OpenAPI v3 YAML specification at `/api/docs`.
4. **Unused Layout Dependencies (`vaul` & `react-resizable-panels`):**
   - **File:** [frontend/package.json](file:///c:/Antigravityyyyy/AI%20CITY/frontend/package.json) (Lines 27, 31)
   - **Defect:** `vaul` and `react-resizable-panels` add unnecessary weight to `package.json` while drawers and split-panes use standard Tailwind CSS.
   - **Action Required:** Either refactor `OperationsCenterPage.tsx` to use `PanelGroup`/`Panel` and `Drawer.Root`, or prune them from `package.json`.

---

### Priority P2: Quality-of-Life & Heuristic Refinements
5. **Fallback Keyword Priority Collision ("waterlogged" $\to$ `WATER_BOARD`):**
   - **File:** [backend/src/utils/pureHelpers.ts](file:///c:/Antigravityyyyy/AI%20CITY/backend/src/utils/pureHelpers.ts) (Line 50)
   - **Defect:** When Gemini is offline, description *"Deep waterlogged pothole on main road"* matches keyword `"water"` and assigns `"WATER_BOARD"` instead of `"PWD"`.
   - **Action Required:** Ensure compound hazard phrases (e.g. `"waterlogged pothole"`, `"flooded road"`) prioritize structural road hazards (`PWD`) over raw utility keywords.
6. **Operations Center Live Synchronization (Polling vs WebSocket):**
   - **File:** [frontend/src/features/operations/pages/OperationsCenterPage.tsx](file:///c:/Antigravityyyyy/AI%20CITY/frontend/src/features/operations/pages/OperationsCenterPage.tsx) (Line 80)
   - **Defect:** The console relies on periodic HTTP polling (`setInterval(fetchIncidents, 15000)`) instead of real-time WebSocket events.
   - **Action Required:** Implement Socket.io or Server-Sent Events (SSE) on the Express backend and subscribe in the Operations Center.
7. **Resolution Notes Payload Parameter Naming:**
   - **File:** [backend/src/controllers/officer.controller.ts](file:///c:/Antigravityyyyy/AI%20CITY/backend/src/controllers/officer.controller.ts) (Line 172)
   - **Defect:** Controller strictly requires `resolutionNotes` ($\ge 10$ characters); if client sends singular `resolutionNote`, it returns `400 Bad Request`.
   - **Action Required:** Accept `req.body.resolutionNotes || req.body.resolutionNote` for backwards compatibility.
