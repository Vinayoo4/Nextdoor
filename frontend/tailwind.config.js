/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        indigo: {
          950: '#1e1b4b',
        },
        primary: '#4f46e5',
        'primary-dark': '#1e1b4b',
        accent: '#f59e0b',
        emergency: '#dc2626',
        verified: '#2563eb',
      },
    },
  },
  plugins: [],
}
