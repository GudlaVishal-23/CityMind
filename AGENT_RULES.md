# AI CITY Autonomous Civic Operations Platform — Permanent Engineering Rules

This document codifies the mandatory engineering standards for all human developers, AI agents, and automated tools operating within the AI CITY repository. These rules are derived from Google Site Reliability Engineering (SRE), the Google TypeScript Style Guide, and the Microsoft Security Development Lifecycle (SDL).

---

## 1. Context Efficiency (Graphify-First Navigation)
1. **Query Dependency Graph First**: Before editing or creating any module, query the project dependency structure to map callers, callees, shared data schemas, and side effects.
2. **Minimal Edit Radius**: Keep changes strictly localized to the target task. Never execute whole-file rewrites when surgical modifications suffice.
3. **Teamwork & State Separation**: The `.agents/teamwork/` directory is reserved exclusively for agent communication and metadata (plans, progress, reports). Never place application source code, tests, or persistent domain data in `.agents/`.

---

## 2. Strict Type Safety (Google TypeScript Style Guide)
1. **Uncompromised Strictness**: `tsconfig.json` must enforce `"strict": true` at all times across all workspaces (`backend`, `frontend`, `api`).
2. **Zero `any` Policy**:
   - The use of `any` or `as any` is strictly forbidden.
   - Use `unknown`, generics, discriminated unions, or explicit interfaces.
3. **Explicit Return Types**: All exported controllers, services, middleware, route handlers, and utility functions must specify explicit return types (e.g. `Promise<void>`, `Promise<IncidentResponse>`).
4. **Defensive Nullability**: Explicitly handle `null` and `undefined` using strict null checks, optional chaining, and nullish coalescing. Never rely on loose truthy/falsy coercion for typed data structures.

---

## 3. Zero-Trust Boundaries (Microsoft Security Development Lifecycle - SDL)
1. **100% Boundary Validation**:
   - Every incoming HTTP request (`req.body`, `req.query`, `req.params`) must be validated against a strict Zod schema before reaching business logic.
   - Reject unvalidated fields and malformed payloads with HTTP 400 Bad Request.
2. **Never Trust Client State**:
   - Client-reported identity, roles, or query flags (e.g. `all=true`, `role=admin`) must never be accepted blindly.
   - Enforce tenant and user isolation: citizen requests must strictly query against the authenticated user's ID (`req.user.firebaseUid` or `req.user.id`).
3. **Server-Side Role-Based Access Control (RBAC)**:
   - Protected routes must enforce role authorization at the middleware layer using `requireRole(['officer', 'admin'])`.
4. **Production Gating of Developer Bypasses (DEF-SEC-02)**:
   - Developer mock tokens (`dev-citizen`, `dev-officer`, `dev-admin`) are strictly prohibited in production (`NODE_ENV === 'production'`).
   - Dev token evaluation must be strictly gated behind `(NODE_ENV === 'development' || NODE_ENV === 'test') && ENABLE_DEV_AUTH === 'true'`.
   - In production, unauthenticated requests or requests with dev tokens must return `401 Unauthorized` with `{ success: false, error: 'Unauthorized: Valid authentication token required' }`.
5. **Strict CORS Whitelisting (DEF-SEC-03)**:
   - Dynamic reflection (`origin: true`) is prohibited.
   - Origin matching must strictly evaluate against `CORS_ALLOWED_ORIGINS`. Unauthorized origins must be rejected with HTTP 403 Forbidden.

---

## 4. Fail-Fast Configuration & Secret Hygiene (Google SRE)
1. **Centralized Environment Validation (DEF-SEC-01)**:
   - All runtime configuration must be parsed and validated via Zod in `backend/src/config/env.ts` at server startup.
   - In `production`, missing critical secrets (`MONGODB_URI`, `GEMINI_API_KEY`) or illegal bypass flags (`ENABLE_DEV_AUTH === true`) must trigger immediate process termination (`process.exit(1)`).
2. **Zero Secret Disclosure**:
   - Never commit `.env` or credential files to version control.
   - Never log secret values, API keys, passwords, or PII in logs, error traces, or console outputs.
   - Error messages must report the failing configuration key path without displaying its value.
3. **Template Synchronization**:
   - Maintain sanitized `backend/.env.example` and `frontend/.env.example` containing only safe placeholder keys.

---

## 5. Atomic, Scoped, and Testable Changes
1. **Zero Architectural Regression**:
   - Preserve the 7-stage LangGraph workflow (`backend/src/services/langGraphBrain.service.ts`).
   - Preserve the 4-tier database resilience architecture (`backend/src/config/dbFallback.ts`).
2. **Deterministic Verification**:
   - Pair bug fixes and security hardening with deterministic unit or integration tests.
   - Every commit must pass `npx tsc --noEmit` and `npm run lint` with 0 errors across backend and frontend.
