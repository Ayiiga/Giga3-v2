import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        base: ["1.125rem", { lineHeight: "1.75rem" }],
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
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(124, 92, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 92, 255, 0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 92, 255, 0.35), transparent)",
        "btn-primary":
          "linear-gradient(135deg, #2563eb 0%, #3b82f6 45%, #60a5fa 100%)",
        "btn-image":
          "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
        "btn-video":
          "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)",
      },
      boxShadow: {
        "btn-primary": "0 10px 28px -6px rgba(37, 99, 235, 0.55)",
        "btn-image": "0 10px 28px -6px rgba(16, 185, 129, 0.45)",
        "btn-video": "0 10px 28px -6px rgba(239, 68, 68, 0.45)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
