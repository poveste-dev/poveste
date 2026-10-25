// Prints the first fenced block of a docs page whose first line is the comment
// naming a file, such as `// vitest.config.ts`, so a smoke pass runs what the
// page prints rather than a copy of it that can drift. A section's heading, when
// given, limits the search to that section.
//
// Usage: node guide-block.mjs <page> <file the block's first line names> [section]

import { readFileSync } from 'node:fs'
import process from 'node:process'

const [page, file, section] = process.argv.slice(2)
let text = readFileSync(page, 'utf8')
if (section) {
  const start = text.indexOf(`\n## ${section}\n`)
  if (start < 0) {
    console.error(`${page} has no section "## ${section}"`)
    process.exit(1)
  }
  const end = text.indexOf('\n## ', start + 1)
  text = text.slice(start, end < 0 ? undefined : end)
}
const blocks = [...text.matchAll(/^```\w*\n([\s\S]*?)^```$/gm)].map(match => match[1])
const block = blocks.find(body => body.startsWith(`// ${file}\n`))
if (!block) {
  console.error(`${page} has no block that starts with "// ${file}"${section ? ` under "## ${section}"` : ''}`)
  process.exit(1)
}
process.stdout.write(block)
