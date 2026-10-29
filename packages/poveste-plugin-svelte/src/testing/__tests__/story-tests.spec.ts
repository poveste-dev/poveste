import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolveConfig } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { povesteTesting } from '../../vitest.js'

const BOOK = fileURLToPath(new URL('../../../fixtures/testing/book', import.meta.url))
const VITEST = join(dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs')
const out = mkdtempSync(join(tmpdir(), 'poveste-svelte-story-tests-'))

afterAll(() => {
  rmSync(out, { recursive: true, force: true })
})

const INHERITED = ['BASE_URL', 'DEV', 'FORCE_TTY', 'MODE', 'NODE_ENV', 'PROD', 'SSR', 'TEST']

interface Assertion {
  fullName: string
  status: string
  failureMessages: string[]
}

/** Runs one project of the story-test book, and each test's outcome by name. */
async function run(project: string): Promise<Map<string, Assertion>> {
  const file = join(out, `${project}.json`)
  // Some of the book's stories fail on purpose, so the run exits non-zero. It runs
  // without what this run put in the environment, which the child reads as its own.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST') && !INHERITED.includes(key)))
  await promisify(execFile)(process.execPath, [VITEST, 'run', '--project', project, '--reporter=json', `--outputFile=${file}`], { cwd: BOOK, env })
    .catch((error: { code?: number }) => {
      if (typeof error.code !== 'number') {
        throw error
      }
    })
  const report = JSON.parse(readFileSync(file, 'utf8')) as { testResults: { assertionResults: Assertion[] }[] }
  return new Map(report.testResults.flatMap(result => result.assertionResults).map(assertion => [assertion.fullName, assertion]))
}

describe.each(['jsdom', 'browser'])('a Svelte story file as tests, in %s', (project) => {
  let results: Map<string, Assertion>

  beforeAll(async () => {
    results = await run(project)
  })

  it('reports every variant of the book', () => {
    expect(results.size).toBe(10)
  })

  it('passes every variant of a story that renders, its setup file and initState included', () => {
    expect([...results.values()].filter(r => r.fullName.startsWith('Passing ')).map(r => [r.fullName, r.status])).toEqual([
      ['Passing Passing plain', 'passed'],
      ['Passing Passing from initState', 'passed'],
      ['Passing Passing from the setup file', 'passed'],
    ])
  })

  it.each([
    ['throws in render', 'render threw on purpose'],
    ['throws in an effect', 'an effect threw on purpose'],
    ['warns', 'a warning on purpose'],
    ['compares a state proxy', 'state_proxy_equality_mismatch'],
    ['throws in initState', 'initState threw on purpose'],
  ])('fails a variant that %s, naming what it printed', (variant, message) => {
    const result = results.get(`Failing Failing ${variant}`)!

    expect(result.status).toBe('failed')
    expect(result.failureMessages.join('\n')).toContain(message)
  })

  it('still passes the sound variant of a story whose others fail', () => {
    expect(results.get('Failing Failing fine')?.status).toBe('passed')
  })

  it('renders in the environment Vitest gives it: a browser has `ResizeObserver`, jsdom does not', () => {
    expect(results.get('Measures Measures observed')?.status).toBe(project === 'browser' ? 'passed' : 'failed')
  })
})

describe('the Vite config a story test runs under', () => {
  async function resolved(plugins: unknown[]) {
    const config = await resolveConfig({ root: BOOK, configFile: false, logLevel: 'silent', plugins: plugins as never[] }, 'serve')
    return { include: config.optimizeDeps.include ?? [], entries: config.optimizeDeps.entries ?? [], alias: config.resolve.alias }
  }

  it('is the project\'s own, with only Svelte, the vendored Vue and the setup file added to pre-bundling', async () => {
    const own = await resolved([svelte()])

    expect(await resolved([svelte(), povesteTesting()])).toEqual({
      ...own,
      include: [...own.include, 'svelte', 'svelte/internal/client', 'svelte/internal/disclose-version', 'svelte/store', '@poveste/vendors/vue', '@poveste/controls'],
      entries: [...own.entries, 'src/setup.ts'],
    })
  })
})
