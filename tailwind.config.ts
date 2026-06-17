import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15171a",
        paper: "#f7f4ef",
        line: "#ded7cc",
        moss: "#5f7863",
        brass: "#b48442",
        sky: "#4f7d95",
        coral: "#bf6b5e"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(21, 23, 26, 0.09)"
      }
    }
  },
  plugins: []
};

export default config;
