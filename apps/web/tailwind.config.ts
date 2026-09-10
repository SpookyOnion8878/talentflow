import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Semantic surface/text tokens — channels defined in globals.css
           per theme (.dark overrides). Never use raw slate colors in
           components; use these tokens so both themes render correctly. */
        bg: "rgb(var(--bg-channel) / <alpha-value>)",
        surface: "rgb(var(--surface-channel) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2-channel) / <alpha-value>)",
        border: "rgb(var(--border-channel) / <alpha-value>)",
        "text-hi": "rgb(var(--text-hi-channel) / <alpha-value>)",
        "text-mid": "rgb(var(--text-mid-channel) / <alpha-value>)",
        "text-lo": "rgb(var(--text-lo-channel) / <alpha-value>)",
        soft: "rgb(var(--accent-soft-channel) / <alpha-value>)",
        link: "rgb(var(--link-channel) / <alpha-value>)",
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        sidebar: {
          DEFAULT: "#0b1220",
          foreground: "#94a3b8",
          active: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgb(var(--border-channel) / 1)",
      },
      divideColor: {
        DEFAULT: "rgb(var(--border-channel) / 1)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
        topbar: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #8b5cf6 100%)",
        "brand-soft": "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)",
        "hero-grid":
          "linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
