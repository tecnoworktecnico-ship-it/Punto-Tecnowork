import type { Config } from "tailwindcss";
const config: Config = { content: [ "./src/pages//*.{js,ts,jsx,tsx,mdx}", "./src/components//.{js,ts,jsx,tsx,mdx}", "./src/app/**/.{js,ts,jsx,tsx,mdx}", ], theme: { extend: { colors: { glass: { 100: 'rgba(255, 255, 255, 0.1)', 200: 'rgba(255, 255, 255, 0.2)', 300: 'rgba(255, 255, 255, 0.3)', dark: 'rgba(0, 0, 0, 0.4)', }, 'glass-border': 'rgba(255, 255, 255, 0.2)', }, backdropBlur: { xs: '2px', }, keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' }, }, shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' }, }, blob: {
    '0%': { transform: 'translate(0px, 0px) scale(1)' },
    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
    '100%': { transform: 'translate(0px, 0px) scale(1)' },
  },
}, animation: { float: 'float 6s ease-in-out infinite', shimmer: 'shimmer 3s linear infinite', blob: 'blob 7s infinite cubic-bezier(0.6, -0.28, 0.735, 0.045)', }, }, }, plugins: [], }; export default config;