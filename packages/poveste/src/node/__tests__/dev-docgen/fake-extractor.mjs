import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'

export function createExtractor({ root, options }) {
  appendFileSync(options.marker, 'created\n')
  return {
    extract: (file) => {
      // Node's message for a missing TypeScript, with the book's own path in it (#1382).
      if (options.fail) {
        throw new Error(`Cannot find module 'typescript'\nRequire stack:\n- ${root}/node_modules/vue-component-meta/index.js`)
      }
      return { props: [{ name: basename(file), type: 'string', required: false, tags: [] }], slots: [], events: [] }
    },
    // A file outside the book's root that the "program" read, as a sibling
    // package's types would be (#1190).
    sources: () => options.outside ? [options.outside] : [],
    dispose: () => {},
  }
}
