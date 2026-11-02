/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          navy: '#102344',
          'navy-dark': '#0B1830',
          'navy-light': '#1A335F',
          blue: '#1765CE',
          'blue-hover': '#1354AC',
          bg: '#F4F7FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          dark: '#0F172A',
          rate: {
            red: '#EF4444',
            'red-bg': '#FEE2E2',
            green: '#10B981',
            'green-bg': '#D1FAE5',
            yellow: '#F59E0B',
            'yellow-bg': '#FEF3C7',
          }
        }
      }
    },
  },
  plugins: [],
}

