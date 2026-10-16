import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'

export function createExtractor({ options }) {
  appendFileSync(options.marker, 'created\n')
  return {
    extract: file => ({ props: [{ name: basename(file), type: 'string', required: false, tags: [] }], slots: [], events: [] }),
    // A file outside the book's root that the "program" read, as a sibling
    // package's types would be (#1190).
    sources: () => options.outside ? [options.outside] : [],
    dispose: () => {},
  }
}
