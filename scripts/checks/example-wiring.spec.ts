import { appendFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  asServers,
  builtExamples,
  checkExampleWiring,
  conformanceBooks,
  duplicatePorts,
  exampleNames,
  guideExamples,
  matrixExamples,
  onlyInFirst,
  portFromCommand,
  portOf,
  portsByExample,
  portsOf,
  requiredContexts,
} from './example-wiring.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

// The cases below are the drift this guard exists for: #384 shipped an example in
// the workflow matrix and not in the Playwright config, and the job died before a
// test ran.

describe('matrixExamples', () => {
  it('reads the example list out of the workflow matrix', () => {
    const workflow = [
      '    strategy:',
      '      matrix:',
      '        example: [vue, nuxt, vike]',
    ].join('\n')

    expect(matrixExamples(workflow)).toEqual(['vue', 'nuxt', 'vike'])
  })

  it('returns nothing when the matrix is not where it used to be', () => {
    // An empty list would otherwise read as "the matrix and the config agree",
    // which is why the caller treats this as a problem rather than a pass.
    expect(matrixExamples('jobs:\n  test:\n    runs-on: ubuntu-latest')).toEqual([])
  })
})

describe('exampleNames', () => {
  it('collapses an example\'s projects to one name', () => {
    const projects = ['vue', 'vue:conformance', 'vue:dev', 'vue:dev-shared', 'vike', 'vike:dev']

    expect(exampleNames(projects)).toEqual(['vue', 'vike'])
  })
})

describe('conformanceBooks', () => {
  it('names the book behind each :conformance project', () => {
    expect(conformanceBooks(['vue:conformance', 'quasar:conformance'])).toEqual(['vue', 'quasar'])
  })

  it('ignores a project that is not a conformance one', () => {
    expect(conformanceBooks(['vue', 'vue:conformance', 'vue:dev'])).toEqual(['vue'])
  })

  it('names a book once however many conformance projects it has', () => {
    expect(conformanceBooks(['vue:conformance', 'vue:conformance'])).toEqual(['vue'])
  })

  // The state both callers treat as "this checked nothing". It was stated in
  // two files and asserted in neither until the derivation became one function
  // (#719).
  it('finds no books when the config defines no conformance project', () => {
    expect(conformanceBooks(['vue', 'svelte:dev'])).toEqual([])
  })
})

describe('builtExamples', () => {
  it('reads the books a build script filters to', () => {
    const script = 'pnpm --filter ./examples/vue --filter ./examples/vue-tailwind run story:build'

    expect(builtExamples(script)).toEqual(['vue', 'vue-tailwind'])
  })

  it('reads a filter written with an equals sign', () => {
    expect(builtExamples('pnpm --filter=./examples/quasar run story:build')).toEqual(['quasar'])
  })

  it('builds nothing when the script is gone', () => {
    expect(builtExamples(undefined)).toEqual([])
  })
})

describe('portOf', () => {
  it('reads the port a server is waited on', () => {
    expect(portOf('http://localhost:4572')).toBe(4572)
  })

  it('has no port for a server that declares no url', () => {
    expect(portOf(undefined)).toBeUndefined()
  })
})

describe('portFromCommand', () => {
  it('reads the port a preview script binds', () => {
    expect(portFromCommand('poveste preview --port 4572')).toBe(4572)
  })

  it('has no port when the script leaves it to the default', () => {
    expect(portFromCommand('poveste preview')).toBeUndefined()
  })
})

describe('portsOf', () => {
  it('tells an example\'s preview server from its dev server', () => {
    const servers = [
      { command: 'pnpm run story:preview', url: 'http://localhost:4572' },
      { command: 'pnpm exec poveste dev --port 4672', url: 'http://localhost:4672' },
    ]

    expect(portsOf(servers)).toEqual({ preview: 4572, dev: 4672 })
  })
})

describe('portsByExample', () => {
  it('attributes each server to the example its command names', () => {
    const servers = [
      { command: 'pnpm --filter ./examples/vue run story:preview', url: 'http://localhost:4567' },
      { command: 'pnpm --filter ./examples/vue exec poveste dev --port 4667', url: 'http://localhost:4667' },
      { command: 'pnpm --filter ./examples/vike run story:preview', url: 'http://localhost:4572' },
    ]

    expect(portsByExample(servers).get('vue')).toEqual({ preview: 4567, dev: 4667 })
    expect(portsByExample(servers).get('vike')).toEqual({ preview: 4572 })
  })

  it('keeps an example whose name contains a dash', () => {
    const servers = [
      { command: 'pnpm --filter ./examples/vue-tailwind run story:preview', url: 'http://localhost:4571' },
    ]

    expect([...portsByExample(servers).keys()]).toEqual(['vue-tailwind'])
  })
})

describe('duplicatePorts', () => {
  it('names a port two servers would both try to hold', () => {
    expect(duplicatePorts([4567, 4568, 4567])).toEqual([4567])
  })

  it('does not call two absent ports a collision', () => {
    expect(duplicatePorts([undefined, undefined, 4567])).toEqual([])
  })
})

describe('onlyInFirst', () => {
  it('names the example the matrix runs and the config does not define', () => {
    // #384, exactly: the matrix gained `vike` and ALL_EXAMPLES did not.
    expect(onlyInFirst(['vue', 'vike'], ['vue'])).toEqual(['vike'])
  })
})

describe('asServers', () => {
  it('accepts the lone object Playwright also allows', () => {
    expect(asServers({ command: 'pnpm run story:preview' })).toHaveLength(1)
  })

  it('has no servers when a config declares none', () => {
    expect(asServers(undefined)).toEqual([])
  })
})

describe('guideExamples', () => {
  const table = [
    '| | |',
    '| --- | --- |',
    '| **Reference books** | `vue`, `nuxt`, `svelte`, `sveltekit` — carry the full conformance set |',
    '| **Conformance books** | `quasar` — the conformance set only |',
    '| **Fixtures** | `vike`, `vue-tailwind` — each exists for one narrow thing |',
  ].join('\n')

  it('reads both lists out of the guide table', () => {
    expect(guideExamples(table)).toEqual({
      reference: ['vue', 'nuxt', 'svelte', 'sveltekit'],
      conformance: ['quasar'],
      fixtures: ['vike', 'vue-tailwind'],
    })
  })

  it('ignores the prose beside the names, so a row can be reworded freely', () => {
    const reworded = table.replace('carry the full conformance set', 'carry every conformance story')

    expect(guideExamples(reworded).reference).toEqual(['vue', 'nuxt', 'svelte', 'sveltekit'])
  })

  // Reported as a problem rather than passing vacuously: a renamed heading would
  // otherwise turn the guard off without failing anything.
  it('finds nothing when the table is gone', () => {
    expect(guideExamples('# Poveste\n\nNo table here.')).toEqual({ reference: [], conformance: [], fixtures: [] })
  })
})

describe('requiredContexts', () => {
  it('reads one context per line, ignoring comments and blanks', () => {
    const file = ['# what main requires', '', 'Build', 'Example e2e (vue)  ', '# Example e2e (vue3)'].join('\n')

    expect(requiredContexts(file)).toEqual(['Build', 'Example e2e (vue)'])
  })

  it('reads nothing out of a file that is not there', () => {
    expect(requiredContexts('')).toEqual([])
  })
})

describe('checkExampleWiring', () => {
  // The fixture brings its own `playwright.config.ts`, importing nothing: the
  // real one imports `@playwright/test`, which does not resolve from a tmpdir.
  it('reports a workflow with no example matrix to read', async () => {
    const root = tree({
      '.github/workflows/test-examples.yml': 'jobs:\n  test:\n    runs-on: ubuntu-latest\n',
      'playwright.config.ts': 'export default { projects: [], webServer: [] }\n',
      'ai/AGENTS.md': '# Guide\n',
      'examples/': '',
    })

    expect((await checkExampleWiring(root)).problems).toContainEqual(expect.stringContaining('has no `example:` matrix to read'))
  })

  // #706: quasar and vike were booted by the config and built by nothing. The
  // harness is otherwise in agreement, so the build script is the only drift.
  function harnessBuilding(buildScript: string): string {
    return tree({
      'package.json': JSON.stringify({ scripts: { 'story:build:e2e': buildScript } }),
      '.github/workflows/test-examples.yml': `jobs:\n  e2e:\n    name: Example e2e ($\u007B{ matrix.example }})\n    strategy:\n      matrix:\n        example: [vue]\n`,
      '.github/required-status-checks.txt': 'Example e2e (vue)\n',
      'playwright.config.ts': 'export default { projects: [{ name: \'vue\' }], webServer: [{ command: \'pnpm --filter ./examples/vue run story:preview\', url: \'http://localhost:4567\' }] }\n',
      'ai/AGENTS.md': '| **Fixtures** | `vue`, `vike` |\n',
      'examples/vue/package.json': JSON.stringify({ scripts: { 'story:preview': 'poveste preview --port 4567' } }),
      'examples/vike/package.json': '{}',
    })
  }

  it('reports a book the config boots and the build script never builds', async () => {
    const root = harnessBuilding('pnpm -r run story:build')

    expect((await checkExampleWiring(root)).problems).toEqual(['playwright.config.ts boots "vue", which `story:build:e2e` never builds — a full local run waits two minutes on its server and runs no spec'])
  })

  it('reports a book the build script builds and the config never serves', async () => {
    const root = harnessBuilding('pnpm --filter ./examples/vue --filter ./examples/vike run story:build')

    expect((await checkExampleWiring(root)).problems).toEqual(['`story:build:e2e` builds "vike", which playwright.config.ts never serves'])
  })

  // #793 in miniature: the matrix entry was renamed and branch protection was
  // not, so `main` required a job that can never report again.
  it('reports a required context no workflow can produce, and says the fix is a setting', async () => {
    const root = harnessBuilding('pnpm --filter ./examples/vue --filter ./examples/vike run story:build')
    writeFileSync(join(root, '.github/required-status-checks.txt'), 'Example e2e (vue3)\n')

    const [problem] = (await checkExampleWiring(root)).problems.filter(text => text.includes('branch protection'))

    expect(problem).toContain('requires "Example e2e (vue3)"')
    expect(problem).toContain('branch-protection settings rather than in code')
  })

  it('accepts a required context named by a job that declares no name of its own', async () => {
    const root = harnessBuilding('pnpm --filter ./examples/vue --filter ./examples/vike run story:build')
    appendFileSync(join(root, '.github/workflows/pr-title.yml'), 'jobs:\n  check-title:\n    runs-on: ubuntu-latest\n')
    writeFileSync(join(root, '.github/required-status-checks.txt'), 'Example e2e (vue)\ncheck-title\n')

    expect((await checkExampleWiring(root)).problems.filter(text => text.includes('branch protection'))).toEqual([])
  })

  it('reports the required-context list going missing', async () => {
    const root = harnessBuilding('pnpm --filter ./examples/vue --filter ./examples/vike run story:build')
    rmSync(join(root, '.github/required-status-checks.txt'))

    expect((await checkExampleWiring(root)).problems).toContainEqual(expect.stringContaining('lists no required contexts'))
  })

  it('the workflow matrix, the Playwright config, the build script, the ports and the guide name the same books', { tags: ['check', 'examples', 'ci'] }, async () => {
    assertNoProblems(await checkExampleWiring())
  })
})
