import type { Config } from "tailwindcss";

/** CSS 変数のチャンネル値を、透過指定つきで使える色に変換する。 */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

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
        // 面と反転色。globals.css の CSS 変数を差し替えてダークモードにする。
        surface: token("--surface"),
        "surface-soft": token("--surface-soft"),
        strong: token("--strong"),
        brand: {
          50: token("--brand-50"),
          100: token("--brand-100"),
          200: token("--brand-200"),
          300: token("--brand-300"),
          400: token("--brand-400"),
          500: "#ef4383",
          600: "#d92668",
          700: token("--brand-700"),
          800: "#8f1745",
          900: "#78173e",
          // brand-600 は塗りに使うので、文字色は別トークンにする。
          fg: token("--brand-fg"),
        },
        plum: {
          100: token("--plum-100"),
          300: "#d8b4fe",
          500: "#a855f7",
          700: token("--plum-700"),
        },
        ink: {
          50: token("--ink-50"),
          100: token("--ink-100"),
          200: token("--ink-200"),
          400: token("--ink-400"),
          500: token("--ink-500"),
          600: token("--ink-600"),
          700: token("--ink-700"),
          900: token("--ink-900"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #ff8fbe 0%, #ef4383 45%, #a855f7 100%)",
        "brand-soft": "var(--brand-soft)",
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
