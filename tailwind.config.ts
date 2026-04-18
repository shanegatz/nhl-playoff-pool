import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ice: "#e8f4f8",
        rink: "#0b1220",
      },
    },
  },
  plugins: [],
};

export default config;
