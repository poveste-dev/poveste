// Tailwind only runs in poveste-dev mode, where the example renders the
// unbuilt app source. v4 is CSS-first, so there is no config file to point at.
module.exports = process.env.POVESTE_DEV
  ? {
      plugins: [
        require('@tailwindcss/postcss'),
      ],
    }
  : {
      plugins: [],
    }
