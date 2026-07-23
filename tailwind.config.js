/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ceibo: {
          green: '#1B5E20',
          'green-light': '#43A047',
          sale: '#1565C0',
          bg: '#F4F6F0',
        },
      },
    },
  },
  plugins: [],
};
