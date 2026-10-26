import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
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
        mentneo: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0284c7",
          600: "#0369a1",
          700: "#075985",
          800: "#0c4a6e",
          900: "#082f49",
        },
        navy: {
          800: "#0f172a",
          900: "#0a0f1d",
          950: "#050811",
        },
        accent: {
          teal: "#0d9488",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        }
      },
    },
  },
  plugins: [],
};
export default config;
