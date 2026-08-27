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
// No network, no build: it reads the workflow text and imports the configs, so it
// checks the config the harness actually resolves rather than how it is written.

import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW = '.github/workflows/test-examples.yml'

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

  console.log(`✅ ${configured.length} examples wired the same way in ${WORKFLOW}, playwright.config.ts and their own package.json`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
