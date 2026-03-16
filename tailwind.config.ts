import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff4ee',
          100: '#ffe3cc',
          400: '#e8733a',
          500: '#C8511A',
          600: '#a84015',
        },
        surface: {
          50:  '#f8f9fb',
          100: '#f1f3f7',
          200: '#e4e8f0',
          800: '#1e2028',
          850: '#181a20',
          900: '#12141a',
          950: '#0d0f14',
        }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.35), 0 1px 2px -1px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)',
        'glow': '0 0 20px rgba(200,81,26,0.25)',
      }
    }
  },
  plugins: []
};

export default config;
