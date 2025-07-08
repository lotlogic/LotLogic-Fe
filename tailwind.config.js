module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <-- Required for App Router
  ],
  theme: {
    extend: {
      colors: {
        'primary-btn': '#2F5D62',
      },
      fontFamily: {
        serifpro: ['"Source Serif Pro"', 'serif'],
      },
    },
  },
  plugins: [],
}
