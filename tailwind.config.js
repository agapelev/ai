/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",
    "./public/**/*.js",
    "./src/**/*.ts",
    "./src/**/*.tsx"
  ],
  theme: {
    extend: {
      colors: {
        // Shekinah Mission брендовые цвета
        'shekinah-blue': '#3b82f6',
        'shekinah-green': '#10b981',
        'shekinah-purple': '#8b5cf6',
        'shekinah-gold': '#f59e0b',
        // Интеграция с текущими CSS переменными
        primary: 'var(--accent-primary)',
        secondary: 'var(--accent-secondary)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--border-color)'
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'serif': ['Georgia', 'serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'shekinah': '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
  darkMode: 'class'
}
