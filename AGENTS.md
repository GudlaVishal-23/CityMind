# AI CITY Enterprise Engineering Standards & Agent Guardians

This document establishes the mandatory engineering standards, security guardrails, and architectural invariants for all developers, agents, and automated workflows operating in the AI CITY codebase.

---

## 1. Microsoft SDL & Google SRE Code Guardians

### Zero-Trust Authorization Guardian
- **NEVER** trust client-side role state (`localStorage`), query flags (`?all=true`), unverified request parameters, or unauthenticated tokens.
- **ALWAYS** enforce tenant isolation (`userId: req.user.uid`) and explicit RBAC middleware (`requireRole(['admin', 'officer'])`) at the Express route and controller boundaries.
- **NEVER** bypass authentication or permission checks based on development flags unless strictly executing within `(NODE_ENV === 'development' || NODE_ENV === 'test') && ENABLE_DEV_AUTH === 'true'`.

### Insecure Direct Object Reference (IDOR) Prevention Rule
- **NEVER** execute `findByIdAndUpdate` or `findByIdAndDelete` on user-owned or tenant-scoped resources.
- **ALWAYS** use compound ownership filters: `findOneAndUpdate({ _id: req.params.id, userId: req.user.uid }, ...)` or `findOneAndDelete({ _id: req.params.id, userId: req.user.uid })`.
- **ALWAYS** validate Mongoose ObjectIds before querying using `mongoose.Types.ObjectId.isValid(id)` and return `400 Bad Request` if malformed.

### PII Redaction & Data Minimization Guardian
- **NEVER** return raw `firebaseUid`, personal phone numbers, physical home addresses, or sensitive internal credentials on public or citizen-facing endpoints.
- **ALWAYS** use explicit Mongoose `.select()` projections (e.g. `.select('-userId -reporterPhone -reporterEmail')`) or Zod response DTO serializers.
- **ALWAYS** sanitize public map queries and operational graph outputs so only non-sensitive operational metrics (e.g. ticket category, sanitized status, badgeNumber, distanceKm) are exposed.

### Fail-Fast Configuration & Secret Hygiene
- **NEVER** commit `.env`, `.env.local`, or any credential file to version control.
- **ALWAYS** validate runtime configuration at startup via strict Zod schemas (`backend/src/config/env.ts`).
- **ALWAYS** terminate with `process.exit(1)` in production if critical secrets (`MONGODB_URI`, `GEMINI_API_KEY`) are missing or illegal dev bypasses are enabled.

### Diff & Verification Discipline
- **ALWAYS** keep diffs atomic and scoped (< 5 files per logical task).
- **NEVER** claim a task or sprint ticket is complete without running `npx tsc --noEmit` and `npm run lint` across both `backend/` and `frontend/` to confirm 0 compile and 0 lint errors.
- **NEVER** alter the 7-stage LangGraph cognitive pipeline logic or the 4-tier database resilience fallback cascade unless explicitly requested.

---

## 2. Google API Design & Microsoft Governance Contract Guardians

### Single-Source Status Enum Guardian (Google API Design)
- **NEVER** invent ad-hoc status strings (`AI_Assigned`, `InProgress`, etc.) in routes or UI components.
- **ALWAYS** import and validate against the canonical Incident status union (`'Submitted' | 'Verified' | 'Assigned' | 'In_Progress' | 'Resolved' | 'Rejected'` — matching the exact Mongoose schema definition in `backend/src/models/incident.model.ts`).

### REST Verb Contract Guardian
- **NEVER** call `POST` on a `PATCH` endpoint.
- **ALWAYS** enforce that partial state updates (`/status`, `/override`, `/read`) use `PATCH` end-to-end across backend routes and frontend API callers.

### Immutable Audit Trail Guardian (Microsoft Governance)
- **NEVER** mutate `incident.status`, `incident.priority` / `incident.severity`, or `incident.department` in an admin or officer controller without atomically pushing a structured audit entry (`{ status, timestamp: new Date(), note, actorId, changedBy, role }`) into `incident.statusHistory`.
- **ALWAYS** capture the reason, prior state, new state, and authenticated user identity in the audit note.

### Zero Hardcoded Hostnames Guardian
- **NEVER** write `http://localhost:5000` or raw `fetch('http://...')` inside React components.
- **ALWAYS** use the centralized Axios `api` client configured via `import.meta.env.VITE_API_BASE_URL` with global request/response interceptors.

### Command-Center Interaction Standard
- **ALWAYS** use `cmdk` and `vaul` (or Radix Dialog/Sheet primitives) for keyboard-first command palettes (`Ctrl+K`) and slide-over XAI telemetry inspection drawers, maintaining zero layout shift (`CLS = 0`) and optimistic UI feedback via `sonner` toasts.

---

## 3. Performance, Spatial Indexing & AI Quota Guardians

### Zero N+1 AI / Embedding Loops Guardian (Google SRE Latency Rule)
- **NEVER** invoke `@google/genai` embeddings, Gemini Vision calls, or remote image fetches inside a loop over historical database records during an HTTP request.
- **ALWAYS** precompute the 3072-dim text embedding and 64-bit perceptual `dHash` exactly ONCE when an incident is ingested, persist them on the `Incident` document, and execute duplicate comparisons purely against precomputed vectors in memory.

### Geospatial & Compound Indexing Guardian
- **NEVER** run unindexed spatial or status filters on MongoDB collections.
- **ALWAYS** ensure every GeoJSON coordinate path declares a `2dsphere` index, and candidate duplicate queries MUST pre-filter by indexed bounding box / ward and active timeframe before computing vector cosine similarity.
- **ALWAYS** bound in-memory vector indexes / FAISS caches to a maximum of 2,500 active entries to eliminate memory leaks.

---

## 4. Distributed Polyglot Transactions & Serverless Guardians

### Polyglot Saga & ACID Transaction Guardian (Microsoft Data Integrity Standard)
- **NEVER** execute dual-database mutations (MongoDB document write + Neo4j Cypher graph write) without transactional coordination.
- **ALWAYS** use our `executeWithPolyglotTransaction()` helper that wraps MongoDB writes in a Mongoose `ClientSession` transaction (when connected to a Replica Set / Atlas) and executes a compensating rollback if the downstream Neo4j graph mutation fails.

### Serverless Cold-Start Idempotency Guardian (Google SRE Standard)
- **NEVER** leave secondary databases uninitialized in serverless entrypoints (`api/index.ts`).
- **ALWAYS** cache initialization promises on `globalThis` so warm serverless invocations reuse existing MongoDB and Neo4j connection pools without leaking sockets.

### Bounded In-Memory Fallback Guardian
- **NEVER** allow unbounded `Map` or array growth in `dbFallback.ts` or the in-memory Neo4j graph emulator (`neo4j.ts`).
- **ALWAYS** enforce a maximum capacity (e.g., 5,000 documents/nodes) with FIFO/LRU eviction for oldest non-critical entries.

---

## 5. Google & Microsoft Testing Guardians (Day 7 — QA Automation Standards)

### Hermetic & Deterministic Unit Tests (Google Testing Standards)
- **NEVER** write tautological tests that mock the function under test — unit tests MUST call and execute the **real** exported pure TypeScript function or mathematical algorithm directly.
- **ALWAYS** ensure the full unit test suite completes in `< 2000ms` total with **zero external network sockets**, **zero live Gemini API calls**, and **zero reliance on wall-clock timing**.
- **ALWAYS** export pure deterministic helper functions (e.g., `computeDuplicateScore`, `detectDepartment`, `assessPriority`, `checkLuminance`, `isInGhmcBounds`) to `backend/src/utils/pureHelpers.ts` so they can be unit-tested independently without breaking existing service callers.

### Boundary & Adversarial Assertion Rule (Microsoft SDL QA Standard)
- **EVERY** unit test suite MUST cover at least **three conditions**:
  - **(a) Nominal valid input** — typical happy-path values that should succeed.
  - **(b) Exact boundary threshold** — e.g., luminance `avg = 39` (passes) vs `avg = 40` (blocked), Hamming distance `10` (duplicate) vs `11` (distinct), GPS `500m` (match) vs `501m` (mismatch).
  - **(c) Malicious or corrupted input** — `null`, empty `ArrayBuffer`, truncated JPEG bytes, SSRF metadata IPs (`169.254.169.254`), and ReDoS strings (`(a+)+$`).

### Mandatory Test Gate
- **NEVER** mark a defect as resolved or a sprint task as complete unless `npm test` passes **100% of registered suites with 0 failures**.
- **NEVER** introduce test code that imports from `../../../` more than 3 levels deep — restructure exports cleanly via `pureHelpers.ts` instead.

---

## 6. Google & Microsoft API & Security Regression Guardians (Day 8 — API & Security Testing)

### No-Regression Security Lock (Microsoft SDL)
- **EVERY** remediated OWASP vulnerability (`DEF-SEC-02` through `DEF-SEC-07`, `DEF-BE-05`, `DEF-OPS-04`) MUST have an automated failing-if-reintroduced Supertest regression test in `backend/tests/security/`.
- **NEVER** remove or weaken an existing security test assertion or regression harness when refactoring routes or middleware.

### Negative-Path Parity (Google Testing Standard)
- **EVERY** protected Express route MUST be tested for both its happy path (`200`/`201`) and its denial paths (`400` malformed input, `401` unauthenticated, `403` wrong role, `404` non-owned or missing resource).
- **NEVER** assert only `200 OK` on a newly added or modified endpoint.

### Isolated Test State
- **EVERY** Supertest suite MUST reset in-memory/MongoMemoryServer collections in `beforeEach` or `afterAll` so tests never leak state or depend on execution order.
- **NEVER** allow state from a prior test to contaminate subsequent assertions across user identities or incident queues.

---

## 7. Google & Microsoft Integration, Chaos & Performance Guardians (Day 9 — Chaos & Reliability)

### Deterministic Chaos & Failure Injection Guardian (Google SRE Testing)
- **Integration tests MUST** verify failure modes—not just happy paths. Explicitly inject simulated database disconnects, Neo4j write errors, and concurrent cold starts to prove fallback and rollback paths execute cleanly.
- **NEVER** assume secondary datastores succeed; assert atomic sagas and compensating rollbacks abort partial mutations cleanly.

### Performance Budget & Memory Ceiling Guardian
- **Every performance test MUST** assert quantitative latency ceilings (`p95 < 1500ms`, duplicate checks `< 150ms`, spatial queries `< 200ms`) and bounded memory behavior (`< 120 MB` heap growth under sustained load).
- **NEVER** rely on subjective or unverified `console.log` timings.

---

## 8. DevSecOps & Observability Guardians (Day 10 — Production Hardening)

### Immutable Container & Zero-Secret Layer Guardian (Microsoft SDL)
- **NEVER** `COPY .env` into a Docker image. All secrets MUST be injected exclusively at runtime via environment variables or secret managers.
- **ALWAYS** run production Node and Nginx containers under a non-root user (`USER node` / unprivileged Nginx) with minimal Alpine runtime stages.

### Structured Security Telemetry Guardian (OWASP A09)
- **NEVER** log raw JWTs, API keys, or passwords.
- **ALWAYS** emit structured JSON security events (`event`, `severity`, `ip`, `route`, `actorUid`, `timestamp`) for authentication failures, RBAC denials, SSRF blocks, rate-limit triggers, and administrative overrides.

### CI Gate Non-Bypassability (OWASP A08)
- **Every pull request to `main` MUST** pass automated secret scanning, static typing (`tsc`), linting, all 40 Vitest suites, and production bundle/container builds before merge.
