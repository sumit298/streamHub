import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          50: "#555555",
          150: "#3f4046",
          250: "#3F4346",
          350: "#344154",
          450: "#455A64",
          650: "#202427",
          700: "#232830",
          750: "#1A1C22",
          800: "#050A0E",
          850: "#26282C",
        },
        purple: {
          350: "#5568FE",
        },
        red: {
          650: "#FF5D5D",
        },
        green: {
          150: "#3BA55D",
        },
      },
    },
  },
} satisfies Config;