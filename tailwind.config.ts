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
          50: "#eaf8f9",
          100: "#d7f1f2",
          200: "#b6e1e3",
          300: "#85c4c8",
          400: "#459fa5",
          500: "#18838d",
          600: "#006b76",
          700: "#00535d",
          800: "#003e48",
          900: "#002d35",
        },
        clay: {
          100: "#fce6d9",
          300: "#e4b196",
          500: "#bb7048",
          700: "#824121",
        },
        ink: {
          0: "#fdfeff",
          50: "#f2f6f8",
          100: "#eaeff1",
          200: "#d8dee2",
          400: "#80888c",
          500: "#626a6f",
          600: "#4c5458",
          700: "#31393d",
          900: "#13191d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 6px 20px -8px rgba(19, 25, 29, 0.18)",
        pop: "0 14px 40px -12px rgba(19, 25, 29, 0.32)",
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
