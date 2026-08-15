/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        knowra: {
          bg: "#0B0F1A",
          surface: "#131826",
          primary: "#7C3AED",
          accent: "#38BDF8",
          text: "#F5F3FF",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
