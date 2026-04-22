export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0b',
        surface: '#111113',
        elevated: '#17171a',
        pass: '#00d18c',
        block: '#f03e5e',
        alrt: '#f5a623',
        mutate: '#a78bfa',
        anthropic: '#d97757',
        openai: '#10a37f',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
