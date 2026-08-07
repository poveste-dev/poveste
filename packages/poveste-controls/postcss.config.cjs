module.exports = {
  plugins: [
    // Processes Tailwind in both the CSS entry and Vue SFC <style> blocks
    // (@apply/@reference). @tailwindcss/vite misses SFC styles in lib builds.
    require('@tailwindcss/postcss'),
  ],
}
