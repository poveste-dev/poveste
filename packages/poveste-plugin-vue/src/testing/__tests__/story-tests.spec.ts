import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import vue from '@vitejs/plugin-vue'
import { resolveConfig } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { povesteTesting } from '../vite.js'

const BOOK = fileURLToPath(new URL('../../../fixtures/testing/book', import.meta.url))
const VITEST = join(dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs')
const out = mkdtempSync(join(tmpdir(), 'poveste-story-tests-'))

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
  // Some of the book's stories fail on purpose, so the run exits non-zero.
  // Without what this run put in the environment: its `VITEST_*` variables and the
  // `import.meta.env` keys it copies there. The child read them as its own and
  // failed every file in jsdom.
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

describe.each(['jsdom', 'browser'])('a story file as tests, in %s', (project) => {
  let results: Map<string, Assertion>

  beforeAll(async () => {
    results = await run(project)
  })

  it('reports every variant of the book', () => {
    expect(results.size).toBe(10)
  })

  it('passes every variant of a story that renders, setup file, controls and docs block included', () => {
    expect([...results.values()].filter(r => r.fullName.startsWith('Passing.story.vue')).map(r => [r.fullName, r.status])).toEqual([
      ['Passing.story.vue Passing plain', 'passed'],
      ['Passing.story.vue Passing from initState', 'passed'],
      ['Passing.story.vue Passing from the setup file', 'passed'],
      ['Passing.story.vue Passing with controls', 'passed'],
    ])
  })

  it('fails a variant whose component throws in setup, naming the error', () => {
    const result = results.get('Failing.story.vue Failing throws in setup')!

    expect(result.status).toBe('failed')
    expect(result.failureMessages.join('\n')).toContain('setup threw on purpose')
  })

  it('fails a variant whose async setup throws after an await, once it settles', () => {
    const result = results.get('Failing.story.vue Failing throws after an await')!

    expect(result.status).toBe('failed')
    expect(result.failureMessages.join('\n')).toContain('threw after an await on purpose')
  })

  it('fails a variant that makes Vue warn, quoting the warning', () => {
    const result = results.get('Failing.story.vue Failing warns')!

    expect(result.status).toBe('failed')
    expect(result.failureMessages.join('\n')).toContain('[Vue warn]: Missing required prop: "text"')
  })

  it('fails a variant whose initState rejects, naming the error', () => {
    const result = results.get('Failing.story.vue Failing rejects in initState')!

    expect(result.status).toBe('failed')
    expect(result.failureMessages.join('\n')).toContain('initState rejected on purpose')
  })

  it('still passes the sound variant of a story whose others fail', () => {
    expect(results.get('Failing.story.vue Failing fine')?.status).toBe('passed')
  })

  it('renders in the environment Vitest gives it: a browser has `ResizeObserver`, jsdom does not', () => {
    expect(results.get('Measures.story.vue Measures observed')?.status).toBe(project === 'browser' ? 'passed' : 'failed')
  })
})

// The book lists a CSS-only package and a native Node addon among its dependencies,
// and the browser run above passes with both. That holds because the plugin reads
// nothing from `package.json` and changes no part of how the project resolves.
describe('the Vite config a story test runs under', () => {
  async function resolved(plugins: unknown[]) {
    const config = await resolveConfig({ root: BOOK, configFile: false, logLevel: 'silent', plugins: plugins as never[] }, 'serve')
    return { include: config.optimizeDeps.include ?? [], exclude: config.optimizeDeps.exclude, entries: config.optimizeDeps.entries ?? [], alias: config.resolve.alias }
  }

  it('is the project\'s own, with only `vue` and the setup file added to pre-bundling and nothing to its aliases', async () => {
    const own = await resolved([vue()])

    expect(await resolved([vue(), povesteTesting()])).toEqual({ ...own, include: [...own.include, 'vue'], entries: [...own.entries, 'src/setup.ts'] })
  })
})
