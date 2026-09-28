import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070f',
          900: '#080b16',
          850: '#0b1020',
          800: '#0f1526',
          700: '#161d33',
          600: '#1f2740',
          500: '#2b3450',
        },
        nexus: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bed2ff',
          300: '#93b4ff',
          400: '#608cff',
          500: '#3b66f5',
          600: '#2547e0',
          700: '#1d35bd',
          800: '#1d3099',
          900: '#1d2f79',
        },
        mint: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        amber2: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        rose2: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        violet2: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96,140,255,0.18), 0 18px 45px -20px rgba(59,102,245,0.55)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -28px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(59,102,245,0.18), transparent 55%), linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '100% 100%, 42px 42px, 42px 42px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
