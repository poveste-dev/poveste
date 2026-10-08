import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'

export function createExtractor({ options }) {
  appendFileSync(options.marker, 'created\n')
  return {
    extract: file => ({ props: [{ name: basename(file), type: 'string', required: false, tags: [] }], slots: [], events: [] }),
    dispose: () => {},
  }
}
