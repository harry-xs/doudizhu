/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: "#155D3E",
          dark: "#0d3d29",
          light: "#1c7a52",
        },
        gold: {
          DEFAULT: "#D4AF37",
        },
        brand: {
          DEFAULT: "#238b5c",
          dark: "#1a6b46",
        },
        danger: "#e53e3e",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
