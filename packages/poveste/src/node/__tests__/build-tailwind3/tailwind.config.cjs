module.exports = {
  // Relative to this file, so the glob has no Windows backslashes in it.
  content: { relative: true, files: ['./**/*.{js,md}'] },
  corePlugins: { preflight: false },
}
