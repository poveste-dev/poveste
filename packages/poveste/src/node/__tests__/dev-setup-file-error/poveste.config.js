import { fileURLToPath } from 'node:url'

export default {
  storyMatch: ['**/*.story.mjs'],
  setupFile: process.env.FIXTURE_SETUP_FILE ?? './setup.js',
  // Two workers, so the setup file fails in each and is still reported once.
  collectMaxThreads: 2,
  supportMatch: [{ id: 'fixture', patterns: ['**/*.mjs'], pluginIds: ['fixture'] }],
  plugins: [{
    name: 'fixture-support',
    supportPlugin: {
      id: 'fixture',
      moduleName: fileURLToPath(new URL('./support', import.meta.url)),
      setupFn: 'setupFixture',
    },
  }],
}
