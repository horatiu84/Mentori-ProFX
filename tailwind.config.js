/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1f2937',
          text: '#e5e7eb',
          card: '#374151',
        },
      },
    },
  },
  plugins: [],
};