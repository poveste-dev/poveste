// Asserts the two published version tables against what the packages actually
// declare.
//
// README.md and docs/guide/getting-started.md both tell readers which versions
// Poveste supports, and neither is generated — they are hand-written copies of
// `peerDependencies`. #148 is what that costs: the README advertised
// `svelte ^5.0.0` while the plugin declared `^5.46.4`, inviting a combination
// the docs spend a paragraph explaining cannot be assembled at all.
//
// The policy those docs state is "if a range is wider than the CI job behind
// it, the range is the bug". This script is that policy, enforced.
//
// Node is checked against the published `engines.node`, not `.node-version`:
// the table states what a consumer needs, while `.node-version` pins the
// toolchain contributors and the release build use. They are allowed to differ
// (#303).
//
// No network, no install: it reads files and compares strings.

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')

interface Expectation {
  label: string
  expected: string
  source: string
}

interface Table {
  file: string
  rows: Map<string, string>
}

async function json(path: string): Promise<any> {
  return JSON.parse(await readFile(join(ROOT, path), 'utf8'))
}

async function expectations(): Promise<Expectation[]> {
  const peer = async (path: string, key: string) => {
    const manifest = await json(path)
    const range = manifest.peerDependencies?.[key]
    if (!range) {
      throw new Error(`${path} declares no peerDependencies["${key}"]`)
    }
    return { expected: range, source: `${path} → peerDependencies["${key}"]` }
  }

  const povesteManifest = 'packages/poveste/package.json'
  const engines = JSON.parse(await readFile(join(ROOT, povesteManifest), 'utf8')).engines?.node
  if (!engines) {
    throw new Error(`${povesteManifest} declares no engines.node`)
  }

  return [
    { label: 'Node', expected: engines, source: `${povesteManifest} → engines.node` },
    { label: 'Vite', ...await peer('packages/poveste/package.json', 'vite') },
    { label: 'Vue', ...await peer('packages/poveste-plugin-vue/package.json', 'vue') },
    { label: 'Nuxt', ...await peer('packages/poveste-plugin-nuxt/package.json', 'nuxt') },
    { label: 'Svelte', ...await peer('packages/poveste-plugin-svelte/package.json', 'svelte') },
    { label: 'SvelteKit', ...await peer('packages/poveste-plugin-svelte/package.json', '@sveltejs/kit') },
  ]
}

// `| [Svelte](https://svelte.dev)* | `^5.46.4` | proven by … |` → Svelte, ^5.46.4
function parseTable(file: string, markdown: string): Table {
  const rows = new Map<string, string>()

  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) {
      continue
    }

    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map(cell => cell.replace(/\\\|/g, '|').trim())
    if (cells.length < 2) {
      continue
    }

    const label = cells[0]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown link → its text
      .replace(/[\\*]/g, '')
      .trim()
    const version = cells[1].replace(/`/g, '').trim()

    if (label && version && !rows.has(label)) {
      rows.set(label, version)
    }
  }

  return { file, rows }
}

const TABLES = ['README.md', 'docs/guide/getting-started.md']

const [expected, tables] = await Promise.all([
  expectations(),
  Promise.all(TABLES.map(async file => parseTable(file, await readFile(join(ROOT, file), 'utf8')))),
])

const problems: string[] = []

for (const table of tables) {
  for (const { label, expected: range, source } of expected) {
    const documented = table.rows.get(label)

    if (documented === undefined) {
      problems.push(`${table.file} has no "${label}" row (expected ${range} from ${source})`)
      continue
    }

    if (documented !== range) {
      problems.push(`${table.file} says ${label} ${documented}, but ${source} says ${range}`)
    }
  }
}

// Each plugin's README states its own floor — the most useful fact on its npm
// page, and one more hand-written copy of a peer range. Any `name@range` in a
// package README that names one of that package's own peers must match it.
for (const entry of await readdir(PACKAGES)) {
  const readmePath = join(PACKAGES, entry, 'README.md')

  let readme: string
  let manifest: any
  try {
    manifest = JSON.parse(await readFile(join(PACKAGES, entry, 'package.json'), 'utf8'))
    readme = await readFile(readmePath, 'utf8')
  }
  catch {
    continue
  }

  const peers = manifest.peerDependencies ?? {}

  for (const [, name, range] of readme.matchAll(/`(@?[\w./-]+)@([^`]+)`/g)) {
    if (peers[name] && peers[name] !== range) {
      problems.push(`packages/${entry}/README.md says ${name}@${range}, but its own peerDependencies say ${peers[name]}`)
    }
  }
}

if (problems.length > 0) {
  console.error('❌ Version tables disagree with what the packages declare:\n')
  for (const problem of problems) {
    console.error(`  • ${problem}`)
  }
  console.error('\nThe declared range is the truth. Fix the table, or fix the range and the CI job behind it.')
  process.exit(1)
}

console.log(`✅ ${TABLES.join(' and ')} match the declared ranges (${expected.length} rows each), as do the package READMEs`)
