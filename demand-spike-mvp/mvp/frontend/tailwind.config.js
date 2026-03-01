/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        amd: {
          orange: '#FF6B00',
          red: '#ED1C24',
          dark: '#0A0A0F',
          card: '#111118',
          border: '#1E1E2E',
          muted: '#2A2A3E',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-up': 'fade-up 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255,107,0,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(255,107,0,0.7)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        'fade-up': {
          from: { transform: 'translateY(10px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        }
      }
    }
  },
  plugins: []
}
