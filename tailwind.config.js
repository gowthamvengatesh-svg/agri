/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        primary: '#2E7D32',
        accent: '#66BB6A'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(15, 23, 42, 0.12)'
      }
    }
  },
  plugins: []
};
