import type { Config } from "tailwindcss";

const config: Config = {
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
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 12px 30px -12px rgba(15,23,42,.18)",
      },
    },
  },
  plugins: [],
};

export default config;
