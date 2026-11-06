import { fileURLToPath } from 'node:url'

const polyfill = {
  name: 'polyfill-node-fs',
  enforce: 'pre',
  resolveId: id => id === 'node:fs' ? fileURLToPath(new URL('./shim.js', import.meta.url)) : null,
}

export default {
  storyMatch: [process.env.POVESTE_BUILTIN_STORIES ?? '**/*.story.js'],
  vite: {
    logLevel: process.env.POVESTE_BUILTIN_LOG_LEVEL ?? 'info',
    plugins: process.env.POVESTE_BUILTIN_POLYFILL ? [polyfill] : [],
  },
}
