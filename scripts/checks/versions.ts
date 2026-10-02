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
// Every Node version stated anywhere in `docs/` is held to the same range, and
// each per-framework getting-started page has to state it (#1102, #1106).
//
// Node is checked against the published `engines.node`, not `.node-version`:
// the table states what a consumer needs, while `.node-version` pins the
// toolchain contributors and the release build use. They are allowed to differ
// (#303).
//
// No network, no install: it reads files and compares strings.

import type { CheckResult } from './support/check-result.ts'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compareVersions, hardcodedNodeVersions, lowestVersion } from './node-versions.ts'
import { captured } from './support/captured.ts'

const ROOT = join(import.meta.dirname, '..', '..')

export interface Expectation {
  label: string
  expected: string
  source: string
}

export interface Table {
  file: string
  rows: Map<string, string>
}

async function json(path: string, root: string): Promise<any> {
  return JSON.parse(await readFile(join(root, path), 'utf8'))
}

async function expectations(root: string): Promise<Expectation[]> {
  const peer = async (path: string, key: string) => {
    const manifest = await json(path, root)
    const range = manifest.peerDependencies?.[key]
    if (!range) {
      throw new Error(`${path} declares no peerDependencies["${key}"]`)
    }
    return { expected: range, source: `${path} → peerDependencies["${key}"]` }
  }

  const povesteManifest = 'packages/poveste/package.json'
  const engines = JSON.parse(await readFile(join(root, povesteManifest), 'utf8')).engines?.node
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
    { label: 'Quasar', ...await peer('packages/poveste-plugin-quasar/package.json', 'quasar') },
    { label: 'Quasar App Vite', ...await peer('packages/poveste-plugin-quasar/package.json', '@quasar/app-vite') },
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
    const [labelCell, versionCell] = cells
    if (labelCell === undefined || versionCell === undefined) {
      continue
    }

    const label = labelCell
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown link → its text
      .replace(/[\\*]/g, '')
      .trim()
    const version = versionCell.replace(/`/g, '').trim()

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

/** The values of one matrix variable, e.g. `example: [vue, nuxt]`. */
function matrixValues(yaml: string, key: string): string[] {
  const list = yaml.match(new RegExp(String.raw`^[^\S\n]*${key}:[^\S\n]*\[([^\]]*)\]`, 'm'))?.[1] ?? ''
  return list.split(',').map(value => value.trim()).filter(Boolean)
}

/**
 * The check name of each job — its `name:`, or its id when it declares none.
 *
 * The id fallback is what GitHub reports, and leaving it out made this blind to
 * every unnamed job: `check-title` is a required context on `main` and was not in
 * this set, so a docs row citing it would have read as a citation of a job that
 * does not exist (#795).
 *
 * Matching every indented `name:` also collected `with: name:` from
 * upload-artifact steps, so `packages-dist` and `playwright-traces-vue` entered
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
  // The current job's id, held until a `name:` replaces it or the job ends.
  let unnamed: [number, string] | undefined

  for (const [index, line] of lines.entries()) {
    if (line.startsWith('jobs:')) {
      if (unnamed) {
        yield unnamed
      }
      unnamed = undefined
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
      if (unnamed) {
        yield unnamed
      }
      unnamed = undefined
      inJobs = false
      continue
    }

    idIndent ??= indent
    if (indent === idIndent) {
      // A job id: its own keys set the depth, which the next line establishes.
      if (unnamed) {
        yield unnamed
      }
      const id = trimmed.match(/^([\w-]+):/)?.[1]
      unnamed = id ? [index, id] : undefined
      keyIndent = undefined
      continue
    }

    keyIndent ??= indent
    if (indent !== keyIndent) {
      continue
    }

    const name = trimmed.match(/^name:[^\S\n]*(\S.*)$/)?.[1]
    if (name) {
      unnamed = undefined
      yield [index, name.trim().replace(/^['"]|['"]$/g, '')]
    }
  }

  if (unnamed) {
    yield unnamed
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

    for (const match of evidence.matchAll(/`([^`]+)`/g)) {
      const cited = captured(match)
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
  if (!engines) {
    return []
  }

  return nodeClaims(readme)
    .filter(claimed => claimed !== engines)
    .map(claimed => `packages/${pkg}/README.md says Node ${claimed}, but its own engines.node says ${engines}`)
}

/**
 * Every Node range a page states in prose: Node `<range>`, where the range starts
 * with a version or an operator before one. Read that narrowly so that "the Node
 * `fs` module" is prose rather than a claim the check would hold to a version.
 */
export function nodeClaims(markdown: string): string[] {
  return [...markdown.matchAll(/Node\s+`([\s<=>^~v]*\d[^`]*)`/g)].map(match => captured(match))
}

/**
 * A published `engines.node` must be one `>=` floor, with nothing above it.
 *
 * npm resolves backwards when no published version satisfies the running Node: it
 * walks back to the newest release with no `engines` field at all, which for this
 * package is `0.6.1` from before the field existed, and installs it with only a
 * deprecation notice. So a range that rejects any version above its own floor —
 * `^22.22.2 || ^24.15.0 || >=26.0.0` rejected every 24.x below 24.15, which is
 * what `fnm` installs as `lts-latest` — hands that reader a nine-minor-old
 * package silently (#901).
 *
 * Reproduced on 24.13.0 and, below the floor, on 20.19.0: `npm i poveste` added
 * `poveste@0.6.1` on both. Naming a version explicitly (`poveste@latest`) installs
 * the real one and warns instead, which is the only mitigation left for a Node
 * below the floor.
 */
export function engineFloorProblems(pkg: string, engines: string | undefined): string[] {
  // No field at all is the shape that makes a version the *target* of that walk
  // back, rather than its victim: `0.6.1` is where npm lands precisely because it
  // predates the field, and npm reads an absent `engines` as accepting every Node.
  // Only `packages/poveste` was guarded against losing it, in `expectations()`.
  if (!engines) {
    return [`packages/${pkg}/package.json declares no engines.node: npm reads that as accepting every Node, which is what makes a published version the one an unsupported Node resolves back to (#901)`]
  }

  if (/^>=\d+\.\d+\.\d+$/.test(engines.trim())) {
    return []
  }

  return [`packages/${pkg}/package.json declares engines.node \`${engines}\`, which is not a single \`>=\` floor: a Node above it that the range rejects installs an ancient version instead of failing (#901)`]
}

/**
 * Each plugin's README states its own floor — the most useful fact on its npm
 * page, and one more hand-written copy of a peer range. Any `name@range` in a
 * package README that names one of that package's own peers must match it.
 */
export function readmeRangeProblems(pkg: string, readme: string, peers: Record<string, string>): string[] {
  const problems: string[] = []

  for (const match of readme.matchAll(/`(@?[\w./-]+)@([^`]+)`/g)) {
    const name = captured(match, 1)
    const range = captured(match, 2)
    if (peers[name] && peers[name] !== range) {
      problems.push(`packages/${pkg}/README.md says ${name}@${range}, but its own peerDependencies say ${peers[name]}`)
    }
  }

  return problems
}

/**
 * The lowest Node a `setup-node` spec can install: `^24.15.0` is 24.15.0, `18.x`
 * is 18.0.0. Undefined for anything that is not one such version, which the
 * caller reports rather than guesses at.
 */
export function specMinimum(spec: string): string | undefined {
  const parts = spec.replace(/^(?:[~^v]|>=)/, '').split('.')
  if (parts.length > 3) {
    return undefined
  }
  const filled = [0, 1, 2].map(index => parts[index] === undefined || parts[index] === 'x' || parts[index] === '*' ? '0' : parts[index]!)
  return filled.every(part => /^\d+$/.test(part)) ? filled.join('.') : undefined
}

/**
 * Every Node version a page in `docs/` states, held to the published `engines.node`.
 *
 * A prose claim, Node `<range>`, must be the range itself, as a package README's is.
 * A `node-version:` in a recipe is executed rather than read, so it must not be
 * able to install anything under the floor: the lost-pixel recipe said `18.x`
 * three majors after the floor moved, and a reader copying it got an older
 * Poveste from npm, whose only warning named a dependency (#1102, #901).
 */
export function docsNodeProblems(file: string, markdown: string, engines: string): string[] {
  const problems: string[] = []

  for (const claimed of nodeClaims(markdown)) {
    if (claimed !== engines) {
      problems.push(`${file} says Node ${claimed}, but packages/poveste/package.json → engines.node says ${engines}`)
    }
  }

  const floor = lowestVersion(engines)
  for (const use of hardcodedNodeVersions(file, markdown)) {
    const minimum = specMinimum(use.value)
    if (minimum === undefined || floor === undefined) {
      problems.push(`${file}:${use.line} sets node-version ${use.value}, which cannot be read as a version to hold against engines.node ${engines}`)
    }
    else if (compareVersions(minimum, floor) < 0) {
      problems.push(`${file}:${use.line} sets node-version ${use.value}, which can install Node ${minimum}, under the ${floor} that engines.node requires`)
    }
  }

  return problems
}

/**
 * The per-framework getting-started pages are where a reader installs, and on a
 * Node under the floor npm installs an older Poveste without an error. A page
 * that states no floor leaves that reader nothing to check (#1106).
 */
export function nodeFloorReachProblems(file: string, markdown: string): string[] {
  if (!/^docs\/guide\/[^/]+\/getting-started\.md$/.test(file) || nodeClaims(markdown).length > 0) {
    return []
  }
  return [`${file} does not state the Node floor, and it is a page a reader installs from`]
}

export interface Walk {
  /** Workflow file contents, which `jobNames` reads the job list out of. */
  workflows: string[]
  /** Packages whose README and manifest were both readable. */
  packages: Array<{ entry: string, readme: string, manifest: any }>
  /** Every markdown page under `docs/`, by its path from the root. */
  docs: Array<{ file: string, markdown: string }>
}

/**
 * The walk, split from the judging so a spec can point it at a fixture tree
 * and assert what it read (#719).
 */
export async function collect(root = ROOT): Promise<Walk> {
  const workflowDir = join(root, '.github', 'workflows')
  const workflows = await Promise.all(
    (await readdir(workflowDir).catch(() => []))
      .filter(name => /\.ya?ml$/.test(name))
      .map(name => readFile(join(workflowDir, name), 'utf8')),
  )

  const packages: Walk['packages'] = []
  for (const entry of await readdir(join(root, 'packages')).catch(() => [])) {
    try {
      const manifest = JSON.parse(await readFile(join(root, 'packages', entry, 'package.json'), 'utf8'))
      const readme = await readFile(join(root, 'packages', entry, 'README.md'), 'utf8')
      packages.push({ entry, readme, manifest })
    }
    catch {
      continue
    }
  }

  const docs: Walk['docs'] = []
  for (const entry of await readdir(join(root, 'docs'), { recursive: true }).catch(() => [])) {
    if (!entry.endsWith('.md') || entry.split(/[\\/]/).some(part => part === 'node_modules' || part.startsWith('.'))) {
      continue
    }
    const file = `docs/${entry.replaceAll('\\', '/')}`
    docs.push({ file, markdown: await readFile(join(root, file), 'utf8') })
  }

  return { workflows, packages, docs }
}

/**
 * The floor: every part of the walk reached something.
 *
 * Any of them going empty is silent on its own — no workflows means every cited
 * job resolves against an empty set, no packages means the per-README range
 * assertions run over nothing, and no docs means no stated Node is checked.
 * The tables above would still match and the success line would still print
 * a row count.
 */
export function walkProblems({ workflows, packages, docs }: Walk): string[] {
  const problems: string[] = []
  if (workflows.length === 0) {
    problems.push('.github/workflows held no workflow files, so every job name cited by a table would resolve against nothing')
  }
  if (packages.length === 0) {
    problems.push('packages/ held no package with both a manifest and a README, so the per-package range assertions examined nothing')
  }
  if (docs.length === 0) {
    problems.push('docs/ held no markdown page, so no Node version stated in the docs was held to engines.node')
  }
  return problems
}

async function repositoryProblems(root = ROOT): Promise<string[]> {
  const [expected, tables] = await Promise.all([
    expectations(root),
    Promise.all(TABLES.map(async file => parseTable(file, await readFile(join(root, file), 'utf8')))),
  ])

  const problems = tables.flatMap(table => tableProblems(table, expected))

  const walk = await collect(root)
  problems.push(...walkProblems(walk))

  for (const file of TABLES) {
    problems.push(...citedJobProblems(file, await readFile(join(root, file), 'utf8'), jobNames(walk.workflows)))
  }

  const engines = expected.find(({ label }) => label === 'Node')!.expected
  for (const { file, markdown } of walk.docs) {
    problems.push(...docsNodeProblems(file, markdown, engines))
    problems.push(...nodeFloorReachProblems(file, markdown))
  }

  for (const { entry, readme, manifest } of walk.packages) {
    problems.push(...readmeRangeProblems(entry, readme, manifest.peerDependencies ?? {}))
    problems.push(...nodeClaimProblems(entry, readme, manifest.engines?.node))
    problems.push(...engineFloorProblems(entry, manifest.engines?.node))
  }

  return problems
}

const REMEDY = 'The declared range is the truth. Fix the table, or fix the range and the CI job behind it.'

export async function checkVersions(root = ROOT): Promise<CheckResult> {
  return { problems: await repositoryProblems(root), remedy: REMEDY, notes: [] }
}
