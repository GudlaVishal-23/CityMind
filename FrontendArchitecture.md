# Frontend Architecture Specification: AI CITY

**Production-Grade Client Architecture (React 19 + TypeScript + Vite)**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Project Folder Structure
AI CITY uses a **Feature-Driven (Domain-Driven) Directory Structure** to organize the code. This ensures clean separation of concerns, scalability as new city operational modules are added, and high modularity.

```
frontend/
├── public/
│   └── maps/                  # Offline tiles or map assets
├── src/
│   ├── assets/                # Global logo assets and styles
│   ├── components/            # Shared cross-domain UI components
│   │   ├── ui/                # Radix UI + Shadcn primitives
│   │   └── Layout/            # Global Shell structures (Sidebars, Headers)
│   ├── config/                # Service configurations (Firebase client, Axios client)
│   ├── features/              # Feature domains (domain encapsulation)
│   │   ├── auth/              # Contexts, route guards, Login pages
│   │   │   ├── components/    # LoginForm, RegistrationForm
│   │   │   ├── hooks/         # useAuthSession
│   │   │   └── pages/         # LoginPage
│   │   ├── incidents/         # Ingestion Form, Timeline, Report Card
│   │   │   ├── components/    # GeopinMap, ThinkingTimeline, ReportCard
│   │   │   ├── hooks/         # useIncidentSubmit
│   │   │   └── pages/         # IngestionPage, IncidentDetailPage
│   │   └── operations/        # AI Heatmap, City Health Scores, Audit Drawer
│   │       ├── components/    # OperationsMap, HealthPanel, AuditDrawer
│   │       ├── hooks/         # useTelemetrySummary
│   │       └── pages/         # OperationsCenterPage
│   ├── hooks/                 # Global utility hooks (useTheme, useGeolocation)
│   ├── routes/                # Central routing table configurations
│   ├── services/              # Base API wrappers (incidentClient, adminClient)
│   ├── store/                 # Global client-side state (Zustand stores)
│   ├── types/                 # Domain and request types
│   ├── utils/                 # Formatting, calculations, coordinate helpers
│   ├── App.tsx                # App root provider wrapper
│   ├── index.css              # Global styles (Tailwind imports, custom HSL variables)
│   └── main.tsx               # Client entrypoint
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

* **Rationale:** Placing components, hooks, and page files within dedicated `features/` folders prevents root-level clutter. If Version 2 requires adding a "Traffic" module, developers simply drop a new `features/traffic/` directory in place without disrupting the "Incidents" or "Auth" logic.

---

## 2. Routing Table & Route Guards
AI CITY implements declarative routing using **React Router (v7)**. Security is enforced at the route boundary via nested layout guards.

```typescript
// Type definitions for Route Config
import { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: '', element: <LandingPage /> }
    ]
  },
  {
    path: '/citizen',
    element: <AuthGuard allowedRoles={['citizen', 'admin']} />,
    children: [
      {
        element: <CitizenShellLayout />,
        children: [
          { path: 'dashboard', element: <CitizenDashboardPage /> },
          { path: 'report', element: <CitizenReportPage /> },
          { path: 'incident/:id', element: <CitizenIncidentDetailPage /> }
        ]
      }
    ]
  },
  {
    path: '/ops',
    element: <AuthGuard allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminDashboardLayout />,
        children: [
          { path: '', element: <OperationsCenterPage /> },
          { path: 'incident/:id', element: <AdminIncidentDetailPage /> }
        ]
      }
    ]
  },
  { path: '*', element: <NotFoundPage /> }
];
```

### Route Guards Implementation Design
* **`AuthGuard`:** Listens to the Firebase authentication state. If the user session is loading, it displays a skeleton screen. If unauthenticated, it redirects to `/login` with the current location stored in browser state to allow redirect-back behavior.
* **`RoleGuard`:** Extracted from custom claims on the decoded Firebase ID token. In v1.0, roles are strictly mapped to `citizen` or `admin`. Accessing administrative paths `/ops` without the `admin` claim yields an immediate HTTP 403 fallback route.

---

## 3. App Shell Layouts
1. **Citizen Shell Layout (`CitizenShellLayout`):**
   * **Structure:** A mobile-first, sticky top-navigation design. It includes a header with city telemetry (e.g. quick emergency contacts, weather alerts) and a responsive slide-out user settings profile.
   * **Responsive Behavior:** Side margins are locked at `px-4 md:px-8 max-w-7xl mx-auto` to prevent layout breaking on wider desktop monitors.
2. **Admin Dashboard Layout (`AdminDashboardLayout`):**
   * **Structure:** A high-density sidebar navigation framework designed for dark modes. The navigation column stays locked at a compact `w-64` on desktops and collapses to a slide-over mobile drawer on touch displays.
   * **Density Principle:** Padding is minimized (`p-4` rather than `p-8`) to display the maximum number of telemetry metrics and map layers inside the browser viewport.

---

## 4. State Management Strategy: Zustand vs. TanStack Query
To maintain simplicity and prevent Redux boilerplate, the client separates client-side state and server-side state strictly.

```
                  ┌────────────────────────────────────────┐
                  │          App State Boundary            │
                  └──────────────────┬─────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐                     ┌─────────────────────────────────┐
│     Client-Side UI State        │                     │      Server-Side Sync State     │
│       (Zustand Store)           │                     │        (TanStack Query)         │
├─────────────────────────────────┤                     ├─────────────────────────────────┤
│ • Sidebar toggle status         │                     │ • Active incidents list         │
│ • Map viewport zoom & focus     │                     │ • City health index statistics  │
│ • Toast notification queue      │                     │ • AI Decision Audit logs        │
│ • Leaflet active map layer      │                     │ • Authenticated profile context │
└─────────────────────────────────┘                     └─────────────────────────────────┘
```

### Zustand Implementation (Client State)
Zustand is used because it has zero provider wrapping boilerplate, holds store actions directly inside the state, and facilitates direct selector subscriptions.

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeMapLayer: 'streets' | 'satellite' | 'heatmap';
  toggleSidebar: () => void;
  setMapLayer: (layer: 'streets' | 'satellite' | 'heatmap') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeMapLayer: 'streets',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setMapLayer: (layer) => set({ activeMapLayer: layer }),
}));
```

### TanStack Query (Server State Cache-Key Strategy)
TanStack Query (React Query) handles network requests, local caching, pagination, and retry logic automatically.
* **Cache Keys Structure:**
  * `['incidents', { role: 'citizen', userId }]`: Citizen dashboard view.
  * `['incidents', { role: 'admin', filters }]`: Ops Center incident queue.
  * `['incident', incidentId]`: Individual details and audit drawer.
  * `['telemetry', 'city-health']`: Dashboard score metrics.
* **Cache Configuration:**
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 15, // 15 seconds data freshness
        refetchOnWindowFocus: true, // Auto-refetch when operator switches tabs
        retry: 2, // 2 retries on network failures
      },
    },
  });
  ```

---

## 5. Forms, Validation & Ingestion Controls
The incident submission form must be resilient. We use **React Hook Form** paired with **Zod** schema validations.

### Incident Ingest Schema (Zod)
```typescript
import { z } from 'zod';

export const incidentFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Please describe the incident in detail (minimum 10 characters)'),
  imageUrl: z
    .string()
    .url('Please wait for the image upload to complete'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }, { required_error: 'Please drop a pin on the map to define coordinates' })
});
```

* **Visual Ingest Fields:**
  * **Image Upload Box:** Renders a drag-and-drop zone. When a file is dropped, it validates the MIME type (`image/jpeg`, `image/png`, `image/webp`) and size ($<5$MB). It then executes a direct upload to Cloudinary using an unsigned upload preset, updating the react-hook-form state with the resulting HTTPS secure URL.
  * **Interactive Map Selector (Leaflet):** Renders a Leaflet map. Users can click to drop a pin. The map automatically captures latitude and longitude coordinates, triggering a geocoding API lookup to display an approximate human-readable address overlay in the UI.

---

## 6. Custom React Hooks
1. **`useAuth`:**
   Abstracts the Firebase credentials state, exposing simple authentication operations, current token retrieval functions, and registration flows.
   ```typescript
   export const useAuth = () => {
     const user = useUIStore((state) => state.authUser);
     const login = async (email, pass) => { ... };
     const logout = async () => { ... };
     return { user, login, logout, isAuthenticated: !!user };
   };
   ```
2. **`useMapInstance`:**
   Wraps the Leaflet configuration logic. It handles standardizing coordinates, drawing circular pins, updating heat layers, and disposing map assets on unmount to prevent browser memory leaks.
3. **`useAIStatus` (Thinking Tracker):**
   Manages the fake-live visual state transitions of the **AI Thinking Timeline** during file submission, coordinating timing intervals and updating component checks sequentially.

---

## 7. Component Spec 1: AI Thinking Timeline
Renders during the submission request pipeline to show the AI CITY Brain's operations.

```
┌──────────────────────────────────────────────┐
│  AI DECISION ANALYZER                        │
│                                              │
│  [✓] Uploading raw image and metadata...     │
│  [✓] Visual Intelligence Engine processing... │
│  [ ] Severity Assessment Engine analyzing...  │
│  [ ] Department routing evaluating...        │
│                                              │
└──────────────────────────────────────────────┘
```

* **Implementation details:** Built using Framer Motion. Each line renders as a list item with a layout delay transition.
* **Timing Strategy:** While backend processing normally takes 1.5s to 3s, the UI ensures a smooth UX. If the server responds faster than 3 seconds, the UI completes the progress animations at 600ms intervals before displaying the final report card. If the server takes longer, the UI stays at 95% complete state on the final step, resolving as soon as the API response completes.

---

## 8. Component Spec 2: AI Decision Report Card
The resident-facing output panel rendered upon submission.

* **Layout Structure:**
  * Header: Displays category title, creation date, and status.
  * Severity Panel: Renders a badged severity label (e.g. `HIGH`) alongside a progress bar depicting confidence percentage (`confidenceScore * 100`).
  * Department Routing Badge: Displays assigned department code (e.g. `WATER_BOARD`).
  * Explanations Box: Lists markdown-rendered bullet points from `reasoningReport`.
  * Resolution SLA Badge: Displays computed resolution estimate based on severity.

---

## 9. Component Spec 3: AI Operations Center Map & Drawer
The admin dashboard interface for municipal operators.

* **Layout Structure:**
  * Two-column layout: Left column is a high-density, filterable incident datagrid; right column is a full-viewport Leaflet map.
  * **Map Marker Clustering:** Incidents are clustered using Leaflet MarkerCluster. Clicking a marker highlights the row in the datagrid.
  * **AI Decision Audit Drawer:** When an incident row is double-clicked, a Radix UI Drawer slides out from the right viewport edge.
    * It displays the full image, the raw prompt payload variables, the exact latency in milliseconds (`latencyMs`), token usage stats (`promptTokens`, `completionTokens`), and the confidence score.
    * It provides a form for human operator overrides.

---

## 10. Performance, Loading, and Error States

### Performance Optimizations
* **Route Lazy Loading:** Pages are wrapped in `React.lazy()` and loaded dynamically.
  ```typescript
  const OperationsCenterPage = React.lazy(() => import('@features/operations/pages/OperationsCenterPage'));
  ```
* **Map Component Virtualization:** Leaflet tiles are lazy-loaded only when the map element enters the viewport. Markers outside the active map bounding box are excluded from rendering updates to optimize DOM performance.

### Loading & Error Patterns
* **Skeleton Screens:** Main views (dashboard lists, tables) display zinc-toned pulsing skeleton boxes while API queries fetch.
* **Error Boundaries:** Ingestion forms and maps are wrapped in React Error Boundaries. If a Leaflet map script fails to load, it falls back to a clean text-based coordinate grid rather than crashing the browser.

---

## 11. Theme & Design Tokens
AI CITY defaults to a high-contrast, premium **Dark Mode** matching the visual style of Vercel and Linear.

* **Styling Technology:** Tailwind CSS configured with CSS variables.
* **Core Palette Variables (Tailwind CSS `theme.extend`):**
  ```css
  :root {
    --background: 240 10% 3.9%;   /* Deep Charcoal-Black */
    --foreground: 0 0% 98%;        /* Warm white */
    
    --card: 240 10% 6%;            /* Slightly lighter grey */
    --card-foreground: 0 0% 98%;
    
    --primary: 263.4 70% 50.4%;    /* Vivid Violet (Stripe Style) */
    --primary-foreground: 210 20% 98%;
    
    --muted: 240 3.7% 15.9%;       /* Medium slate boundary grey */
    --muted-foreground: 240 5% 64.9%;
    
    --accent: 142.1 76.2% 36.3%;   /* Emerald Green (City health index) */
    --warning: 37.9 90.2% 50.8%;   /* Amber Orange (Medium severity) */
    --destructive: 346.8 77.2% 49.8%;/* Crimson Rose (Critical severity) */
  }
  ```
* **Glassmorphism:** Card containers use `bg-card/50 backdrop-blur-md border border-muted/30` to achieve a modern visual style.

---

## 12. Accessibility Compliance (WCAG 2.1 AA)
1. **Focus Management:** The slide-out Audit Drawer enforces keyboard focus trap boundaries using Radix UI `<Dialog>` viewport primitives. Focus returns to the selected datagrid row when the drawer closes.
2. **ARIA Descriptions:** Image uploads contain screen-reader announcements describing progress states. Map markers include descriptive title attributes (e.g. `aria-label="High Severity Incident - Pothole at coordinates X, Y"`).
3. **Contrast Targets:** All status badges maintain contrast levels above $4.5:1$ against the dark background.
