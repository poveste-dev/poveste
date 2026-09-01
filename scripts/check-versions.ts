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
//
// The comparison lives in exported pure functions and the I/O and the exit live
// in `main()` behind the import guard at the bottom, so importing the helpers
// for a test does not run the whole check and cannot reach `process.exit(1)` and
// kill the runner (#388).

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')

export interface Expectation {
  label: string
  expected: string
  source: string
}

export interface Table {
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
export function parseTable(file: string, markdown: string): Table {
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

/** Every way one documented table can disagree with the declared ranges. */
export function tableProblems(table: Table, expected: Expectation[]): string[] {
  const problems: string[] = []

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

  return problems
}

/**
 * The CI check names the workflows actually produce, with the example matrix
 * expanded: the matrix job in test-examples.yml is seven real checks, one per
 * example, not the one literal name the workflow file spells.
 */
export function jobNames(workflows: string[]): Set<string> {
  const names = new Set<string>()

  for (const yaml of workflows) {
    for (const [, job] of jobKeyNames(yaml)) {
      const key = job.match(/\$\{\{\s*matrix\.(\w+)\s*\}\}/)?.[1]
      if (!key) {
        names.add(job)
        continue
      }

      // Expand with the values of the matrix variable the name actually uses,
      // not whichever list happens to appear first in the file.
      for (const value of matrixValues(yaml, key)) {
        names.add(job.replace(new RegExp(`\\$\\{\\{\\s*matrix\\.${key}\\s*\\}\\}`), value))
      }
    }
  }

  return names
}

/** The values of one matrix variable, e.g. `example: [vue3, nuxt4]`. */
function matrixValues(yaml: string, key: string): string[] {
  const list = yaml.match(new RegExp(String.raw`^[^\S\n]*${key}:[^\S\n]*\[([^\]]*)\]`, 'm'))?.[1] ?? ''
  return list.split(',').map(value => value.trim()).filter(Boolean)
}

/**
 * The `name:` of each job, and nothing else called `name:`.
 *
 * Matching every indented `name:` also collected `with: name:` from
 * upload-artifact steps, so `packages-dist` and `playwright-traces-vue3` entered
 * the set of real CI checks and a docs row citing one of them would have passed.
 * A job's keys sit one level under its id, which is one level under `jobs:`, so
 * that depth is what identifies them — read from the file rather than assumed,
 * because nothing fixes a workflow's indentation at two spaces.
 */
function* jobKeyNames(yaml: string): Generator<[number, string]> {
  const lines = yaml.split('\n')
  let inJobs = false
  let idIndent: number | undefined
  let keyIndent: number | undefined

  for (const [index, line] of lines.entries()) {
    if (line.startsWith('jobs:')) {
      inJobs = true
      idIndent = undefined
      keyIndent = undefined
      continue
    }

    const trimmed = line.trim()
    if (!inJobs || !trimmed || trimmed.startsWith('#')) {
      continue
    }

    const indent = line.length - line.trimStart().length
    if (indent === 0) {
      inJobs = false
      continue
    }

    idIndent ??= indent
    if (indent === idIndent) {
      // A job id: its own keys set the depth, which the next line establishes.
      keyIndent = undefined
      continue
    }

    keyIndent ??= indent
    if (indent !== keyIndent) {
      continue
    }

    const name = trimmed.match(/^name:[^\S\n]*(\S.*)$/)?.[1]
    if (name) {
      yield [index, name.trim().replace(/^['"]|['"]$/g, '')]
    }
  }
}

/**
 * The supported-versions table's whole argument is that each range is proven by
 * something a reader can go and look at. Four of its five named jobs had been
 * deleted by #217, which collapsed the per-framework workflows into one matrix,
 * and the SvelteKit row credited a `svelte-check` run that exists as a script
 * and in no workflow at all (#392).
 *
 * Backticked tokens containing `/` are paths, not job names, so they are skipped.
 */
export function citedJobProblems(file: string, markdown: string, jobs: Set<string>): string[] {
  const problems: string[] = []
  const cells = (line: string) => line.split(/(?<!\\)\|/).slice(1, -1).map(cell => cell.trim())
  let evidenceColumn: number | undefined

  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) {
      // A blank line ends the table, so a later one cannot inherit its columns.
      evidenceColumn = undefined
      continue
    }

    const row = cells(line)
    const header = row.findIndex(cell => /^proven by$/i.test(cell))
    if (header !== -1) {
      evidenceColumn = header
      continue
    }

    const evidence = evidenceColumn === undefined ? undefined : row[evidenceColumn]
    if (!evidence) {
      continue
    }

    for (const [, cited] of evidence.matchAll(/`([^`]+)`/g)) {
      // Backticked tokens with a slash are paths, not job names.
      if (cited.includes('/') || jobs.has(cited)) {
        continue
      }
      problems.push(`${file} says ${cited} proves a range, but no CI job has that name`)
    }
  }

  return problems
}

/**
 * A package README that states a Node requirement must state the one its own
 * manifest declares.
 *
 * `poveste`'s page said `>=26` while its engines allowed `^22.22.2 || ^24.15.0 ||
 * >=26.0.0`, so the most-read npm page turned away two majors that a CI job
 * installs the published tarballs on (#389). A range narrower than what is
 * supported breaks nobody, which is why nothing caught it — it only costs users.
 */
export function nodeClaimProblems(pkg: string, readme: string, engines: string | undefined): string[] {
  const claimed = readme.match(/Node\s+`([^`]+)`/)?.[1]
  if (!claimed || !engines || claimed === engines) {
    return []
  }

  return [`packages/${pkg}/README.md says Node ${claimed}, but its own engines.node says ${engines}`]
}

/**
 * Each plugin's README states its own floor — the most useful fact on its npm
 * page, and one more hand-written copy of a peer range. Any `name@range` in a
 * package README that names one of that package's own peers must match it.
 */
export function readmeRangeProblems(pkg: string, readme: string, peers: Record<string, string>): string[] {
  const problems: string[] = []

  for (const [, name, range] of readme.matchAll(/`(@?[\w./-]+)@([^`]+)`/g)) {
    if (peers[name] && peers[name] !== range) {
      problems.push(`packages/${pkg}/README.md says ${name}@${range}, but its own peerDependencies say ${peers[name]}`)
    }
  }

  return problems
}

async function main(): Promise<void> {
  const [expected, tables] = await Promise.all([
    expectations(),
    Promise.all(TABLES.map(async file => parseTable(file, await readFile(join(ROOT, file), 'utf8')))),
  ])

  const problems = tables.flatMap(table => tableProblems(table, expected))

  const workflowDir = join(ROOT, '.github', 'workflows')
  const workflows = await Promise.all(
    (await readdir(workflowDir))
      .filter(name => /\.ya?ml$/.test(name))
      .map(name => readFile(join(workflowDir, name), 'utf8')),
  )
  const jobs = jobNames(workflows)
  for (const file of TABLES) {
    problems.push(...citedJobProblems(file, await readFile(join(ROOT, file), 'utf8'), jobs))
  }

  for (const entry of await readdir(PACKAGES)) {
    let readme: string
    let manifest: any
    try {
      manifest = JSON.parse(await readFile(join(PACKAGES, entry, 'package.json'), 'utf8'))
      readme = await readFile(join(PACKAGES, entry, 'README.md'), 'utf8')
    }
    catch {
      continue
    }

    problems.push(...readmeRangeProblems(entry, readme, manifest.peerDependencies ?? {}))
    problems.push(...nodeClaimProblems(entry, readme, manifest.engines?.node))
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
}

// Guarded, so importing the helpers above for a test does not run the whole
// check — and cannot reach the `process.exit(1)` above and kill the runner.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
