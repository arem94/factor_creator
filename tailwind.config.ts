import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Vazirmatn Variable",
          "Vazirmatn",
          "Tahoma",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce6ff",
          200: "#c0d0ff",
          300: "#96aeff",
          400: "#6b83ff",
          500: "#4a5cf8",
          600: "#3840ed",
          700: "#2d31d1",
          800: "#282ca8",
          900: "#262c85",
          /* توکن‌های تم (در حالت تاریک مقدارشان عوض می‌شود) */
          soft: "rgb(var(--brand-soft-rgb) / <alpha-value>)",
          ink: "rgb(var(--brand-ink-rgb) / <alpha-value>)",
          strong: "rgb(var(--brand-strong-rgb) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          2: "rgb(var(--surface-2-rgb) / <alpha-value>)",
          3: "rgb(var(--surface-3-rgb) / <alpha-value>)",
        },
        field: "rgb(var(--field-rgb) / <alpha-value>)",
        raised: "rgb(var(--raised-rgb) / <alpha-value>)",
        line: {
          DEFAULT: "rgb(var(--line-rgb) / <alpha-value>)",
          strong: "rgb(var(--line-strong-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          soft: "rgb(var(--ink-soft-rgb) / <alpha-value>)",
        },
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        toggle: "0 1px 2px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
