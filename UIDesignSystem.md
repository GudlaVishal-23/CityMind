# UI Design System: AI CITY

**Production-Grade Design Tokens & Visual Specifications**  
*Document Version:* v1.0  
*Status:* Approved Engineering Blueprint  

---

## 1. Brand Identity & Visual Aesthetic
AI CITY moves away from traditional, outdated government portal aesthetics in favor of a modern, developer-centric SaaS visual identity. Inspired by the designs of **Vercel, Linear, Stripe, and Arc Browser**, the interface utilizes:
* A high-contrast, dark-mode-first color scheme.
* Glassmorphism panels featuring subtle border glows.
* Micro-interactions and transition animations to provide visual feedback.
* High-density telemetry boards designed to present municipal data clearly.

---

## 2. Color System
The color palette uses HSL variables to support dynamic themes.

| Token Name | HSL Value | Hex Equivalent | Usage Description |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `240 10% 3.9%` | `#09090b` | Main application viewport canvas background. |
| **Surface Card** | `240 10% 6%` | `#0f0f12` | Incident cards, telemetry blocks, map sidebars. |
| **Border Muted** | `240 3.7% 15.9%` | `#27272a` | Borders and structural dividers. |
| **Text Primary** | `0 0% 98%` | `#fafafa` | Titles, primary metrics, active text. |
| **Text Muted** | `240 5% 64.9%` | `#a1a1aa` | Labels, details, descriptions, inactive states. |
| **Brand Primary** | `263.4 70% 50.4%` | `#6366f1` | Primary CTA button background, focus rings. |
| **Status Safe (Success)** | `142.1 76.2% 36.3%` | `#16a34a` | "Resolved" status, City Health score indices. |
| **Status Alert (Warning)** | `37.9 90.2% 50.8%` | `#d97706` | "Medium" severity, "Submitted" queue items. |
| **Status Critical (Danger)**| `346.8 77.2% 49.8%` | `#db2777` | "Critical" & "High" severity badges. |

---

## 3. Typography & Spacing Scale

### Font Family Pairing
* **Display / Headings:** `Outfit` (sans-serif) - Google Fonts. Gives a clean, tech-forward feel.
* **Body / Telemetry Data:** `Inter` (sans-serif) - Google Fonts. Chosen for its legibility at small sizes and high-density tabular displays.

### Typographic Hierarchy
* `h1`: `text-3xl font-bold tracking-tight font-display` ($30\text{px}$, line height $36\text{px}$)
* `h2`: `text-xl font-semibold tracking-tight font-display` ($20\text{px}$, line height $28\text{px}$)
* `h3`: `text-base font-medium font-body` ($16\text{px}$, line height $24\text{px}$)
* `body-regular`: `text-sm font-normal text-muted-foreground font-body` ($14\text{px}$, line height $20\text{px}$)
* `data-mono`: `font-mono text-xs font-medium` ($12\text{px}$) - Used for latency meters, token counts, and coordinates.

### Spacing Tokens
We follow a 4px grid system:
* `space-xs`: `4px` (`0.25rem` / `p-1`)
* `space-sm`: `8px` (`0.5rem` / `p-2`)
* `space-md`: `16px` (`1rem` / `p-4`)
* `space-lg`: `24px` (`1.5rem` / `p-6`)
* `space-xl`: `32px` (`2rem` / `p-8`)

---

## 4. Layout, Card, and Component Primitives

### Glassmorphism Card
Cards are designed to look like glass layers, emphasizing the modern tech aesthetic.
* **CSS Class Configuration:**
  ```css
  .glass-card {
    background-color: hsla(240, 10%, 6%, 0.4);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(39, 39, 42, 0.3);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
    border-radius: 12px;
  }
  ```

### Button Specifications
* **Primary Button:** Background: `bg-primary`, Text: `text-white`. Hover transition: `hover:opacity-90 active:scale-[0.98]`.
* **Outline Button:** Background: `bg-transparent`, Border: `border-muted`, Text: `text-primary`. Hover transition: `hover:bg-muted/40`.
* **Destructive Button:** Background: `bg-destructive`, Text: `text-white`. Hover transition: `hover:bg-destructive/90`.
* **Loading State:** Button content is replaced with a spinning loading circle (`animate-spin`), and the button is disabled to prevent double clicks.

---

## 5. UI Elements

### 5.1. Interactive Map & AI Heatmap Layout
The map is powered by Leaflet.js and styled for dark mode using CartoDB Dark Matter tiles.
* **Tile Provider URL:**
  `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
* **Heatmap Configuration:**
  Uses `leaflet-heatmap.js` or standard canvas layers.
  * *Opacity:* `0.7`
  * *Blur:* `15`
  * *Radius:* `25` (pixels)
  * *Gradient scale:*
    ```json
    {
      "0.4": "rgba(22, 163, 74, 0.5)",
      "0.7": "rgba(217, 119, 6, 0.8)",
      "1.0": "rgba(219, 39, 119, 1.0)"
    }
    ```

### 5.2. AI Thinking Timeline Component
Visualizes the AI's reasoning steps after a report is submitted.
* **Layout:** A vertical timeline with connection lines.
* **States:**
  * `Pending`: Dim grey text, pulsing dot.
  * `Processing`: Brand color text (`bg-primary`), spinning circle loader.
  * `Completed`: Bright white text, green checkmark icon (`Status Safe`).
* **Framer Motion Transition:**
  ```typescript
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
  };
  ```

### 5.3. Telemetry Charts & Dashboard Gauges
Charts are built with **Recharts** and styled to match the dark theme.
* **Color Schemes:**
  * Grid lines: `stroke: "rgba(39, 39, 42, 0.3)"`
  * Tooltips: `bg-card border border-muted text-foreground`
  * Bar & Line fills: Gradients moving from `rgba(99, 102, 241, 0.8)` to `rgba(99, 102, 241, 0.1)`.
* **Interactive Behavior:** Highlights bars on hover, and displays tooltips containing detailed category metrics.

---

## 6. Animations (Framer Motion Specs)
Animations are kept subtle to ensure the UI feels responsive and clean.
* **Hover Scale:** Elements scale slightly on hover (`whileHover={{ scale: 1.02 }}`).
* **Page Transitions:** Page loads fade in and slide up (`initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}`).
* **Audit Drawer Slide:** Drawer slides in from the right edge (`x: "100%"` to `x: 0`, using standard ease-out curve `[0.16, 1, 0.3, 1]`).

---

## 7. Component Library Primitives (Radix / Shadcn)
The client requires the following primitives from the **Shadcn UI** library:
1. **Dialog (`@radix-ui/react-dialog`):** Accessible modal containers.
2. **Dropdown Menu (`@radix-ui/react-dropdown-menu`):** User settings and dashboard filter dropdowns.
3. **Drawer (`vaul`):** AI Decision Audit telemetry panel.
4. **Toast (`@radix-ui/react-toast`):** System notifications.
5. **Progress (`@radix-ui/react-progress`):** Visual confidence bars.
