const path = require('node:path')
const inheritedConfig = require('../../tailwind.config.cjs')

module.exports = {
  ...inheritedConfig,
  prefix: 'ptw-',
  content: [
    path.resolve(__dirname, './src/**/*.{vue,js,ts,jsx,tsx,md}'),
  ],
  corePlugins: {
    preflight: false,
  },
}
