/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Matching Phoenix CSS variables
        background: '#1f2937',
        'background-light': '#374151',
        accent: '#f3a3ff',
        'accent-hover': '#e879f9',
        text: '#f9fafb',
        'text-muted': '#9ca3af',
        border: '#4b5563',
        error: '#ff5555',
        success: '#52dd22',
        'item-bg': '#374151',
        'item-hover': '#4b5563',
        'button-bg': '#3b82f6',
        'button-hover': '#2563eb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'rainbow-border': 'rainbowBorder 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        rainbowBorder: {
          '0%': { borderColor: '#ff0000' },
          '17%': { borderColor: '#ff8000' },
          '33%': { borderColor: '#ffff00' },
          '50%': { borderColor: '#00ff00' },
          '67%': { borderColor: '#0080ff' },
          '83%': { borderColor: '#8000ff' },
          '100%': { borderColor: '#ff0000' },
        },
      },
    },
  },
  plugins: [],
};
