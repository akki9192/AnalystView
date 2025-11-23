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
        chart: {
          background: {
            light: '#ffffff',
            dark: '#1a1a1a',
          },
          grid: {
            light: '#e5e7eb',
            dark: '#374151',
          },
          text: {
            light: '#1f2937',
            dark: '#f9fafb',
          },
          candle: {
            up: '#10b981',
            down: '#ef4444',
          },
          gann: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
          }
        }
      }
    },
  },
  plugins: [],
}
