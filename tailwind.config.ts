import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0d0f14",
        surface: "#141720",
        "surface-2": "#191c27",
        border: "#1e2330",
        accent: "#00b4d8",
        gold: "#f4c542",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 20px rgba(244, 197, 66, 0.35)",
        "glow-accent": "0 0 16px rgba(0, 180, 216, 0.35)",
        "glow-emerald": "0 0 16px rgba(52, 211, 153, 0.28)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0,180,216,0.4)" },
          "50%": { boxShadow: "0 0 22px rgba(0,180,216,0.8)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(244,197,66,0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(244,197,66,0.85)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
          "75%": { opacity: "0.95" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        "fade-up": "fade-up 0.45s ease-out both",
        "slide-down": "slide-down 0.25s ease-out both",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2.4s ease-in-out infinite",
        flicker: "flicker 4s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
