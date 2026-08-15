/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        knowra: {
          bg: "#0B0F1A",
          surface: "#131826",
          "surface-elevada": "#1C2131",
          border: "#2A3042",
          primary: "#7C3AED",
          "primary-hover": "#8B5CF6",
          accent: "#38BDF8",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          text: "#F5F3FF",
          "text-secondary": "#A8B0C2",
          "text-terciario": "#747D92",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        display: ["2rem", { lineHeight: "1.15", fontWeight: "700" }], // 32px
        h1: ["1.625rem", { lineHeight: "1.2", fontWeight: "700" }], // 26px
        h2: ["1.375rem", { lineHeight: "1.25", fontWeight: "600" }], // 22px
        h3: ["1.0625rem", { lineHeight: "1.3", fontWeight: "600" }], // 17px
      },
      borderRadius: {
        // rounded-lg(8px)/xl(12px)/2xl(16px) do Tailwind já cobrem sm/md/lg —
        // não sobrescrever (mudaria valor de classes já usadas em todo o app).
        // Só "hero" é novo.
        hero: "20px",
      },
    },
  },
  plugins: [],
};
