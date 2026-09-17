import type { PovesteConfig } from 'poveste'
import { appendFileSync } from 'node:fs'
import { onPovesteCleanup } from 'poveste'

const marker = process.env['POVESTE_CLEANUP_MARKER'] ?? ''

// Registers the way @poveste/plugin-nuxt does, while the config resolves, and
// leaves a line behind each time the cleanup runs.
// `.ts`, not `.js`: the restart specs edit this file, and a `.js` config can be
// served from Node's module cache, so the edit would never be read.
export default {
  plugins: [{
    name: 'cleanup-marker',
    defaultConfig() {
      onPovesteCleanup(() => appendFileSync(marker, 'ran\n'))
    },
  }],
} satisfies Partial<PovesteConfig>
