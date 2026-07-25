/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Dark base — keeps all existing dashboard pages intact */
        background: "hsl(222, 47%, 7%)",
        foreground: "hsl(210, 40%, 98%)",
        card:       "hsl(222, 47%, 9%)",
        muted:      "hsl(217, 19%, 19%)",
        "muted-foreground": "hsl(215, 16%, 57%)",

        /* GHMC Vibrant accent palette */
        primary:       "#0284C7",   /* Civic Teal-Blue   */
        "primary-dark":"#005A9C",   /* Official GHMC Navy */
        safe:          "#10B981",   /* Clean City Green   */
        warning:       "#F59E0B",   /* Saffron Gold       */
        destructive:   "#EF4444",   /* Alert Red          */

        /* Extended GHMC palette for login/public pages */
        "ghmc-sky":    "#0EA5E9",
        "ghmc-navy":   "#0F172A",
        "ghmc-saffron":"#F59E0B",
        "ghmc-green":  "#10B981",
        "ghmc-slate":  "#F8FAFC",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body:    ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
