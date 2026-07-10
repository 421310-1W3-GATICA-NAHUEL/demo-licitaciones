/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dpc: {
          blue: '#0059a3',
          red: '#e30613',
          yellow: '#ffed00',
        },
        sr: {
          green: '#8db92e',
        },
        // Colores de soporte para el estilo "Clean"
        hospital: {
          bg: '#f8fafc',
          card: '#ffffff',
          text: '#1e293b',
          border: '#e2e8f0'
        }
      },
      fontFamily: {
        // Forzamos la fuente Inter que es la más limpia para apps de salud
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // INSTALÁ ESTO: npm install @tailwindcss/typography
  ],
}