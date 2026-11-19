# AI CITY Frontend Design Guardians & 10/10 UI/UX Rules

This document codifies the design system invariants, visual tokens, layout math, and accessibility standards based on Google Material 3 / Web.dev and Microsoft Fluent 2 Acrylic Design System.

---

## 1. Design System Lock (Fluent 2 + Tactical Civic Glassmorphism)

### Global Visual Theme
- **ALWAYS** maintain a unified **Dark Tactical Operations OS** theme across all screens.
- **NEVER** sandwich light-mode cards inside dark-mode views or invert section backgrounds mid-scroll.
- **NEVER** use generic unstyled borders, random pastel gradients, or inconsistent radiuses.

### Surface Hierarchy Tokens (Fluent 2 Acrylic / Elevation)
- **Canvas Base**: `bg-slate-950` (`#020617`)
- **Elevated Card / Panel**: `bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] shadow-2xl`
- **Interactive Hover / Active Surface**: `hover:bg-slate-800/80 hover:border-cyan-500/30 transition-all duration-200`
- **Border Invariant**: `border-white/[0.08]` for structural chrome, `border-white/[0.12]` for elevated modals.

### Semantic Status Tokens (Google M3 Contrast Compliant — WCAG AA 4.5:1)
- **Critical / P0 Hazard**: `text-rose-400 bg-rose-500/10 border-rose-500/30`
- **High / Warning SLA**: `text-amber-400 bg-amber-500/10 border-amber-500/30`
- **Verified / Healthy / Resolved**: `text-emerald-400 bg-emerald-500/10 border-emerald-500/30`
- **AI Cognitive / LangGraph Telemetry**: `text-cyan-400 bg-cyan-500/10 border-cyan-500/30`

---

## 2. Typography & Scannability Rules

- **ALWAYS** use `Inter` or `Plus Jakarta Sans` for body copy, headers, and UI text.
- **ALWAYS** use `JetBrains Mono` (`font-mono tabular-nums`) for all Ticket IDs (`TKT-...`), GPS coordinates, SLA timers, dHash hex values, and confidence percentages.
- **Eyebrow Restraint Rule**: Maximum 1 uppercase tracking label (`text-xs uppercase tracking-wider`) per 3 view sections. Avoid visual clutter.

---

## 3. Bento Grid & Layout Math Rules

- **NEVER** leave orphan or empty cells in CSS Grid layouts.
- **ALWAYS** declare explicit mobile collapse breakpoints: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4`.
- **Navigation Invariant**: Desktop navigation bars MUST render on a single horizontal line (`lg:flex-nowrap`) with active route indicators and keyboard shortcut hints.

---

## 4. Motivated Motion & Core Web Vitals (Google Web.dev)

- **Zero Cumulative Layout Shift (`CLS = 0`)**:
  - **ALWAYS** render matching glassmorphic skeleton loaders (`animate-pulse bg-slate-800/60 rounded-xl`) while async data, route transitions, or auth verification resolve.
  - **NEVER** jump the page height or pop in content abruptly without placeholders.
- **Animation Performance**:
  - Isolate interactive animations into leaf components.
  - Use crisp 150ms–220ms `cubic-bezier(0.16, 1, 0.3, 1)` transitions for hover, focus, and modal expansion.

---

## 5. Accessibility & Focus State (WCAG AA)

- **ALWAYS** supply an explicit `aria-label` on every icon-only button.
- **ALWAYS** render a visible, accessible focus ring on interactive elements:
  `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none`.
- **NEVER** suppress focus outlines without providing an equivalent high-contrast visual replacement.

---

## 6. Contract-First API & Command-Center Interaction Guardians

### Single-Source Status Enum Guardian
- **NEVER** use `'AI_Assigned'` or informal status strings in dropdowns, badges, or filters.
- **ALWAYS** use canonical Incident status tokens: `'Submitted' | 'Verified' | 'Assigned' | 'In_Progress' | 'Resolved' | 'Rejected'`.

### REST Verb Invariant
- **NEVER** use `api.post` for partial state modifications on `/status` or `/override` endpoints.
- **ALWAYS** use `api.patch` for all `/status` endpoints.

### Zero Hardcoded Hostnames
- **NEVER** use `http://localhost:5000` or raw `fetch('http://...')` in React components.
- **ALWAYS** route all calls through the centralized `api` client or `API_BASE_URL` helper.

### Command Palette & Drawer Standards
- **ALWAYS** integrate `cmdk` and `vaul` / Radix primitives for keyboard navigation (`Ctrl+K` command palette) and slide-over telemetry drawers with optimistic UI state and zero layout shift (`CLS = 0`).

---

## 7. Hardware MediaStream & Camera Lifecycle Guardians

### Hardware MediaStream Lifecycle Guardian
- **NEVER** call `navigator.mediaDevices.getUserMedia()` without storing the stream in a `useRef<MediaStream | null>` and explicitly calling `stream.getTracks().forEach(track => track.stop())` inside BOTH the `useEffect` unmount cleanup and modal close/cancel handlers.
- **ALWAYS** set `videoRef.current.srcObject = null` upon stopping the camera stream.
- **ALWAYS** handle race conditions where the modal unmounts or closes while `getUserMedia` is still pending; immediately stop all tracks on the resolved stream to turn off camera hardware LEDs immediately.
- **ALWAYS** catch `NotAllowedError`, `NotFoundError`, and `NotReadableError` cleanly with zero unhandled promise rejections.
- **ALWAYS** render a zero-CLS glassmorphic fallback card (`bg-slate-900/75 backdrop-blur-xl border border-amber-500/30`) with a `lucide-react` `CameraOff` icon and one-click switch to file dropzone when camera access is denied or unavailable.

---

## 8. Frontend Bundle & Code-Splitting Budget (Google Web.dev Core Web Vitals)

### Route-Level Code-Splitting Invariant
- **NEVER** statically import heavy map (`leaflet`/`react-leaflet`), charting (`recharts`), or secondary role console pages (`OperationsCenterPage`, `OfficerDashboardPage`, `IngestionPage`, `CitizenTrackingPage`) into the root entry bundle.
- **ALWAYS** lazy-load route-level pages via `React.lazy()` wrapped in a zero-CLS Dark Tactical `<Suspense>` skeleton (`<TacticalRouteSkeleton />`) matching the target layout grid.
- **ALWAYS** maintain an accessible Error Boundary around lazy routes with a one-click reload button.

### Bundle Size Ceilings
- **Keep initial entry JavaScript chunk strictly under `250 kB` raw (`< 90 kB` gzipped)** via Vite `rollupOptions.output.manualChunks` separating `vendor-react`, `vendor-maps`, `vendor-charts`, and `vendor-ui`.
