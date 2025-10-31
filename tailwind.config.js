/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          md: '2rem',
          lg: '2rem',
          xl: '2.5rem',
        },
        screens: {
          '2xl': '1280px',
        },
      },
      colors: {
        ink: '#0B0F19',
        neutral: {
          900: '#111827',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50:  '#FAFAFA',
        },
        accent: {
          DEFAULT: '#009B91', // Turquesa accent/borda
          600: '#00736E', // Verde-petróleo
          700: '#021616', // Preto esverdeado
        },
        teal: {
          DEFAULT: '#00736E', // Verde-petróleo brilhante
          light: '#009B91', // Turquesa
          dark: '#021616', // Preto esverdeado
        },
        success: '#16A34A',
        warning: '#D97706',
        danger:  '#DC2626',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      borderRadius: {
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,0.08)',
        cardHover: '0 12px 40px rgba(0,0,0,0.10)',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
