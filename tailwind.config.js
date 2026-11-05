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
          navy: '#08264F',
          'navy-dark': '#061D3D',
          'navy-light': '#0D3874',
          blue: '#1455D9',
          'blue-hover': '#1044B2',
          'blue-light': '#EAF2FF',
          bg: '#FFFFFF',
          card: '#FFFFFF',
          border: '#D9E0EA',
          muted: '#667085',
          dark: '#101828',
          rate: {
            red: '#DC2626',
            'red-bg': '#FEE2E2',
            green: '#16A34A',
            'green-bg': '#DCFCE7',
            yellow: '#D97706',
            'yellow-bg': '#FEF3C7',
          }
        }
      }
    },
  },
  plugins: [],
}

