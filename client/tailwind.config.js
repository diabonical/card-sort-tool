/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fbfd',
          100: '#d6f3f9',
          200: '#a3e1ee',
          300: '#6bcde3',
          400: '#1ab5d5',
          500: '#0098b9',
          600: '#007a96',
          700: '#005f76',
          800: '#004558',
          900: '#002d3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
