// Asserts that the lists behind the example e2e matrix still agree with each other.
//
// `examples/vike` shipped in the workflow matrix but not in the root Playwright
// config's `ALL_EXAMPLES`, so the job died on that config's own unknown-name guard
// before a single test ran (#384). Nothing had compared the two, because nothing
// could: one is a YAML matrix and the other a TypeScript array.
//
// The ports are the same shape of problem. Each example states its preview port
// three times — the root config's `webServer`, `story:preview` in its package.json,
// and its own playwright config — and a disagreement is a Playwright run waiting
// two minutes for a server that came up somewhere else.
//
// What this does not cover: an example directory named in neither list. Four exist
// on purpose (vue3-percy, vue3-screenshot, vue3-themed, vue3-vuetify), which is
// #337's subject, so "is a directory under examples/" cannot be the truth here.
//
// It also holds `ai/AGENTS.md` to the same lists. A guide that names the wrong books
// is worse than no guide, and its table is the one part of it a machine can read.
//
// No network, no build: it reads the workflow text and imports the configs, so it
// checks the config the harness actually resolves rather than how it is written.

import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW = '.github/workflows/test-examples.yml'
const GUIDE = 'ai/AGENTS.md'

export interface Ports {
  preview?: number
  dev?: number
}

interface WebServer {
  command?: string
  url?: string
}

export function matrixExamples(workflow: string): string[] {
  const list = workflow.match(/^\s*example:\s*\[([^\]]*)\]/m)?.[1]
  return list ? list.split(',').map(name => name.trim()).filter(Boolean) : []
}

// `vue3`, `vue3:conformance` and `vue3:dev` are one example with three projects.
export function exampleNames(projects: string[]): string[] {
  return [...new Set(projects.map(name => name.split(':')[0]))]
}

export function portOf(url: string | undefined): number | undefined {
  const port = url?.match(/:(\d+)/)?.[1]
  return port ? Number(port) : undefined
}

export function portFromCommand(command: string | undefined): number | undefined {
  const port = command?.match(/--port[= ](\d+)/)?.[1]
  return port ? Number(port) : undefined
}

function role(command: string | undefined): keyof Ports | undefined {
  if (command?.includes('story:preview')) {
    return 'preview'
  }
  return command?.includes('poveste dev') ? 'dev' : undefined
}

// Playwright accepts a lone object as well as an array, and the examples use both.
export function asServers(webServer: unknown): WebServer[] {
  if (Array.isArray(webServer)) {
    return webServer
  }
  return webServer ? [webServer as WebServer] : []
}

export function portsOf(servers: WebServer[]): Ports {
  const ports: Ports = {}
  for (const server of servers) {
    const key = role(server.command)
    if (key) {
      ports[key] = portOf(server.url)
    }
  }
  return ports
}

// The root config's commands carry the example they belong to; a per-example
// config's do not, which is why that one is read with `portsOf` instead.
export function portsByExample(servers: WebServer[]): Map<string, Ports> {
  const byExample = new Map<string, Ports>()
  for (const server of servers) {
    const name = server.command?.match(/\.\/examples\/([\w.-]+)/)?.[1]
    const key = name && role(server.command)
    if (!name || !key) {
      continue
    }
    byExample.set(name, { ...byExample.get(name), [key]: portOf(server.url) })
  }
  return byExample
}

export function duplicatePorts(ports: (number | undefined)[]): number[] {
  const seen = new Set<number>()
  const repeated = new Set<number>()
  for (const port of ports) {
    if (port === undefined) {
      continue
    }
    if (seen.has(port)) {
      repeated.add(port)
    }
    seen.add(port)
  }
  return [...repeated]
}

/**
 * The two lists of examples `AGENTS.md` states, read back out of its table.
 *
 * Only the names in backticks are read, so the prose in each row is free to
 * change without touching this.
 */
export function guideExamples(markdown: string): { reference: string[], fixtures: string[] } {
  const cell = (label: string) => markdown.match(new RegExp(`^\\| \\*\\*${label}\\*\\* \\|(.*)$`, 'm'))?.[1] ?? ''
  const names = (row: string) => [...row.matchAll(/`([\w.-]+)`/g)].map(match => match[1])
  return { reference: names(cell('Reference books')), fixtures: names(cell('Fixtures')) }
}

export function onlyInFirst(a: string[], b: string[]): string[] {
  return a.filter(name => !b.includes(name))
}

async function importDefault(path: string): Promise<any> {
  return (await import(pathToFileURL(join(ROOT, path)).href)).default
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(join(ROOT, path))
    return true
  }
  catch {
    return false
  }
}

async function main(): Promise<void> {
  const problems: string[] = []

  // The root config filters itself by this, and a CI job that sets it would make
  // every other example look missing.
  delete process.env.POVESTE_E2E_EXAMPLE

  const workflow = await readFile(join(ROOT, WORKFLOW), 'utf8')
  const matrix = matrixExamples(workflow)
  if (matrix.length === 0) {
    problems.push(`${WORKFLOW} has no \`example:\` matrix to read — the shape this check reads has changed`)
  }

  const root = await importDefault('playwright.config.ts')
  const configured = exampleNames((root.projects ?? []).map((project: { name: string }) => project.name))
  const rootPorts = portsByExample(asServers(root.webServer))

  for (const name of onlyInFirst(matrix, configured)) {
    problems.push(`${WORKFLOW} runs "${name}", which playwright.config.ts does not define — that job fails before a test runs`)
  }
  for (const name of onlyInFirst(configured, matrix)) {
    problems.push(`playwright.config.ts defines "${name}", which ${WORKFLOW} never runs — nothing tests it in CI`)
  }

  // A book carries the conformance set exactly when the root config gives it a
  // `:conformance` project, so the guide is checked against that rather than
  // against a second hand-kept list.
  // Read rather than crash: the guide has moved once already, and "it is not
  // there" should read as a problem like the others rather than a stack trace.
  const guide = await exists(GUIDE) ? await readFile(join(ROOT, GUIDE), 'utf8') : ''
  if (guide === '') {
    problems.push(`${GUIDE} is missing — the guide the example table lives in has moved or gone`)
  }
  const { reference, fixtures } = guideExamples(guide)
  const conformance = exampleNames(
    (root.projects ?? [])
      .map((project: { name: string }) => project.name)
      .filter((name: string) => name.endsWith(':conformance')),
  )

  if (reference.length === 0 && fixtures.length === 0) {
    problems.push(`${GUIDE} has no example table to read — the shape this check reads has changed`)
  }

  for (const name of onlyInFirst(reference, conformance)) {
    problems.push(`${GUIDE} calls "${name}" a reference book, but playwright.config.ts gives it no conformance project`)
  }
  for (const name of onlyInFirst(conformance, reference)) {
    problems.push(`"${name}" carries the conformance set, but ${GUIDE} does not list it as a reference book`)
  }

  const directories = (await readdir(join(ROOT, 'examples'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
  const listed = [...reference, ...fixtures]

  for (const name of onlyInFirst(listed, directories)) {
    problems.push(`${GUIDE} lists example "${name}", which does not exist`)
  }
  for (const name of onlyInFirst(directories, listed)) {
    problems.push(`examples/${name} exists, but ${GUIDE} does not say what it is for`)
  }

  for (const port of duplicatePorts([...rootPorts.values()].flatMap(ports => [ports.preview, ports.dev]))) {
    problems.push(`playwright.config.ts starts two servers on port ${port} — one book would be tested twice and the other not at all`)
  }

  for (const name of configured) {
    if (!await exists(`examples/${name}/package.json`)) {
      problems.push(`playwright.config.ts defines "${name}", but examples/${name}/package.json does not exist`)
      continue
    }

    const ports = rootPorts.get(name) ?? {}
    const manifest = JSON.parse(await readFile(join(ROOT, `examples/${name}/package.json`), 'utf8'))
    const declared = portFromCommand(manifest.scripts?.['story:preview'])

    if (declared !== ports.preview) {
      problems.push(`examples/${name} previews on port ${declared}, but playwright.config.ts waits on ${ports.preview}`)
    }

    if (!await exists(`examples/${name}/playwright.config.ts`)) {
      continue
    }

    const local = portsOf(asServers((await importDefault(`examples/${name}/playwright.config.ts`)).webServer))
    if (local.preview !== ports.preview) {
      problems.push(`examples/${name}/playwright.config.ts previews on port ${local.preview}, but playwright.config.ts uses ${ports.preview}`)
    }
    if (ports.dev !== undefined && local.dev !== ports.dev) {
      problems.push(`examples/${name}/playwright.config.ts runs dev on port ${local.dev}, but playwright.config.ts uses ${ports.dev}`)
    }
  }

  if (problems.length > 0) {
    console.error('❌ The example harness disagrees with itself:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nThe matrix, playwright.config.ts and each example\'s own package.json all name the same books and the same ports. Fix whichever one drifted.')
    process.exit(1)
  }

  console.log(`✅ ${configured.length} examples wired the same way in ${WORKFLOW}, playwright.config.ts and their own package.json, and all ${listed.length} described in ${GUIDE}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
