import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bccfff',
          300: '#8eaeff',
          400: '#5e85ff',
          500: '#3a60ff',
          600: '#2a44e6',
          700: '#2435b8',
          800: '#222f91',
          900: '#202c75',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
