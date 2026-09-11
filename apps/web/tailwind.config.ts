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
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        sidebar: {
          DEFAULT: "#0f2e2a",
          foreground: "#94a3b8",
          active: "#ccfbf1",
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
        card: "0 1px 2px 0 rgb(15 23 42 / 0.05), 0 4px 12px -4px rgb(15 23 42 / 0.08)",
        "card-hover":
          "0 8px 20px -6px rgb(13 148 136 / 0.18), 0 2px 6px -2px rgb(15 23 42 / 0.08)",
        topbar: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%)",
        "brand-soft": "linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)",
        "hero-grid":
          "linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
