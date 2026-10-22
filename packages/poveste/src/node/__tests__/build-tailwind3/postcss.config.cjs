const path = require('node:path')

// `tailwindcss3` is Tailwind 3 under an alias, so `tailwindcss` stays the workspace's 4.
module.exports = {
  plugins: [require('tailwindcss3')({ config: path.join(__dirname, 'tailwind.config.cjs') })],
}
