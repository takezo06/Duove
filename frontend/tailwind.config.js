/** @type {import('tailwindcss').Config} */
export default {
  // hover: only on devices that can hover, so a tap on a phone never leaves a hover style stuck on
  future: { hoverOnlyWhenSupported: true },
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
