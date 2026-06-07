import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        base: ["1rem", { lineHeight: "1.7" }],
        heading: ["1.5rem", { lineHeight: "1.35" }],
        hero: ["2rem", { lineHeight: "1.25" }],
      },
      maxWidth: {
        chat: "50rem",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        card: "var(--card)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(91, 33, 182, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91, 33, 182, 0.04) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91, 33, 182, 0.12), transparent)",
        "btn-image":
          "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
        "btn-video":
          "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)",
      },
      boxShadow: {
        "btn-image": "0 4px 14px -4px rgba(16, 185, 129, 0.35)",
        "btn-video": "0 4px 14px -4px rgba(239, 68, 68, 0.35)",
        premium: "0 8px 30px -8px rgba(91, 33, 182, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.35s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant("motion-safe", "@media (prefers-reduced-motion: no-preference)");
      addVariant("pointer-fine", "@media (hover: hover) and (pointer: fine)");
    },
  ],
};

export default config;
