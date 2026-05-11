import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0e121b",
        panel: "#151b27",
        border: "#2f3b52",
        accent: "#3dd3a0",
        accentSoft: "#2cae85",
        warning: "#f4b740",
        danger: "#f97373",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(61, 211, 160, 0.25), 0 8px 30px rgba(61, 211, 160, 0.15)",
      },
      backgroundImage: {
        bootcamp:
          "radial-gradient(1200px circle at 10% -20%, rgba(61, 211, 160, 0.22), transparent 60%), radial-gradient(900px circle at 100% 0%, rgba(36, 120, 255, 0.18), transparent 55%), linear-gradient(180deg, #0a0f17 0%, #0d1118 35%, #0f1623 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
