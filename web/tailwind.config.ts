import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0e6ff",
          100: "#d1b3ff",
          200: "#b380ff",
          300: "#944dff",
          400: "#7519ff",
          500: "#5c00e6",
          600: "#4700b3",
          700: "#330080",
          800: "#1f004d",
          900: "#0a001a",
        },
        surface: {
          DEFAULT: "rgb(var(--surface))",
          1: "rgb(var(--surface-1))",
          2: "rgb(var(--surface-2))",
          3: "rgb(var(--surface-3))",
          4: "rgb(var(--surface-4))",
        },
        spotify: {
          green: "#1DB954",
          black: "#191414",
          white: "#FFFFFF",
          dark: "#121212",
        },
        accent: {
          purple: "#a855f7",
          pink: "#ec4899",
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(168, 85, 247, 0.6)" },
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(168, 85, 247, 0.3)",
        "glow-green": "0 0 20px rgba(29, 185, 84, 0.3)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.3)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.37)",
        card: "0 4px 24px rgba(0, 0, 0, 0.25)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
        "brand-gradient": "linear-gradient(135deg, #7519ff, #a855f7, #ec4899)",
        "spotify-gradient": "linear-gradient(135deg, #1DB954, #1ed760)",
      },
    },
  },
  plugins: [],
};

export default config;
