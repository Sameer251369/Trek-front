/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#030014',
          card: '#090716',
          border: '#201b35',
          text: '#f3f4f6',
          muted: '#828095',
        },
        primary: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
          light: '#c084fc',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
