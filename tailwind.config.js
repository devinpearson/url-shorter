/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        background: "hsl(0 0% 100%)",
        foreground: "hsl(0 0% 0%)",
        primary: {
          DEFAULT: "hsl(243 75% 59%)", // indigo-600: 6.3:1 on white (WCAG AA)
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(240 5% 96%)",
          foreground: "hsl(240 10% 9%)",
        },
        muted: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(215 15% 42%)",
        },
        accent: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(240 10% 9%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(0 0% 100%)",
        },
        border: "hsl(240 6% 90%)",
        input: "hsl(240 5% 83%)",
        ring: "hsl(263 70% 84%)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
