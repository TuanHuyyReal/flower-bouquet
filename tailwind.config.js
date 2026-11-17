/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        ivory: '#fff8f1',
        blush: { 50: '#fff5f7', 100: '#fde8ee', 200: '#f9cfdb', 300: '#f3a9bf', 400: '#e87fa0', 500: '#d4587f' },
        mauve: { 700: '#8a4660', 800: '#6b3449' },
      },
    },
  },
  plugins: [],
}
