/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <-- Required for App Router
  ],
  theme: {
    extend: {
      fontFamily: {
        serifpro: ['var(--font-ibm-plex-serif)', 'DM Sans'],
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['IBM Plex Serif', 'serif'],
        subheading: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
  