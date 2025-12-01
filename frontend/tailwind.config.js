/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        buy: '#16a34a',
        hold: '#f59e0b',
        bgGradientStart: '#0f172a',
        bgGradientEnd: '#0b1022'
      },
      boxShadow: {
        glow: '0 0 25px rgba(59, 130, 246, 0.45)',
        buy: '0 0 35px rgba(22, 163, 74, 0.6)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
