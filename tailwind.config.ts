import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#fff1f6",
          100: "#ffe3ee",
          200: "#ffc7dd",
          300: "#ff9ec5",
          400: "#fb6ba6",
          500: "#ef4383",
          600: "#d92668",
          700: "#b31852",
          800: "#8f1745",
          900: "#78173e",
        },
        plum: {
          100: "#f3e8ff",
          300: "#d8b4fe",
          500: "#a855f7",
          700: "#7e22ce",
        },
        ink: {
          50: "#f7f4f5",
          100: "#ece7e9",
          200: "#ddd5d9",
          400: "#8b8189",
          600: "#5b5158",
          900: "#241d22",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #ff8fbe 0%, #ef4383 45%, #a855f7 100%)",
        "brand-soft": "linear-gradient(135deg, #fff1f6 0%, #f7f0ff 100%)",
        "sheen": "linear-gradient(120deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 60%)",
      },
      boxShadow: {
        card: "0 6px 20px -8px rgba(120, 23, 62, 0.18)",
        pop: "0 14px 40px -12px rgba(120, 23, 62, 0.32)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.35s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
