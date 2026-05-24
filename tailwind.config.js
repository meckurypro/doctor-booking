// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Inter', ...defaultTheme.fontFamily.sans],
        mono:    ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          DEFAULT: '#f97316',
          dark:    '#ea580c',
          light:   '#fb923c',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        brand:      '0 4px 20px rgba(249,115,22,0.25)',
        'brand-lg': '0 8px 36px rgba(249,115,22,0.35)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}
