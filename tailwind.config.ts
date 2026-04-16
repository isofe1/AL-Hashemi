import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0f',
        panel: '#11131a',
        line: 'rgba(255,255,255,0.08)',
        soft: '#a3acbb',
        accent: '#0a84ff'
      }
    }
  },
  plugins: []
} satisfies Config;
