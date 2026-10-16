import { fileURLToPath } from 'node:url'

// A docgen plugin with nothing behind it but a log: its extractor records each
// creation to the file named in `POVESTE_DOCGEN_MARKER`, so the spec can tell
// whether anything was started before it asked.
export default {
  storyMatch: ['**/*.story.js'],
  plugins: [{
    name: 'fake-docgen',
    docgen: {
      match: file => file.endsWith('.comp.js'),
      module: fileURLToPath(new URL('./fake-extractor.mjs', import.meta.url)),
      options: { marker: process.env.POVESTE_DOCGEN_MARKER, outside: process.env.POVESTE_DOCGEN_OUTSIDE },
    },
  }],
}
