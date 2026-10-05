import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          screen: "#E5E6E8",
          cream: "#F7F6F1",
          green: "#1A1A1A",
          gold: "#9D9488",
          "gold-light": "#9D9488",
          terracotta: "#9D9488",
          "green-dark": "#1A1A1A",
          "green-light": "#6D727A",
          "cream-light": "#F7F6F1",
          "cream-dark": "#E5E6E8",
          text: "#1A1A1A",
          "text-light": "#9D9488",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        bento: "16px",
        card: "20px",
      },
      boxShadow: {
        bento: "0 4px 24px rgba(26, 26, 26, 0.08)",
        "bento-hover": "0 8px 32px rgba(26, 26, 26, 0.12)",
        soft: "0 2px 12px rgba(26, 26, 26, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
