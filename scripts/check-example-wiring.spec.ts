import { describe, expect, it } from 'vitest'
import {
  asServers,
  duplicatePorts,
  exampleNames,
  guideExamples,
  matrixExamples,
  onlyInFirst,
  portFromCommand,
  portOf,
  portsByExample,
  portsOf,
} from './check-example-wiring.ts'

// The cases below are the drift this guard exists for: #384 shipped an example in
// the workflow matrix and not in the Playwright config, and the job died before a
// test ran.

describe('matrixExamples', () => {
  it('reads the example list out of the workflow matrix', () => {
    const workflow = [
      '    strategy:',
      '      matrix:',
      '        example: [vue3, nuxt4, vike]',
    ].join('\n')

    expect(matrixExamples(workflow)).toEqual(['vue3', 'nuxt4', 'vike'])
  })

  it('returns nothing when the matrix is not where it used to be', () => {
    // An empty list would otherwise read as "the matrix and the config agree",
    // which is why the caller treats this as a problem rather than a pass.
    expect(matrixExamples('jobs:\n  test:\n    runs-on: ubuntu-latest')).toEqual([])
  })
})

describe('exampleNames', () => {
  it('collapses an example\'s projects to one name', () => {
    const projects = ['vue3', 'vue3:conformance', 'vue3:dev', 'vue3:dev-shared', 'vike', 'vike:dev']

    expect(exampleNames(projects)).toEqual(['vue3', 'vike'])
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
      { command: 'pnpm --filter ./examples/vue3 run story:preview', url: 'http://localhost:4567' },
      { command: 'pnpm --filter ./examples/vue3 exec poveste dev --port 4667', url: 'http://localhost:4667' },
      { command: 'pnpm --filter ./examples/vike run story:preview', url: 'http://localhost:4572' },
    ]

    expect(portsByExample(servers).get('vue3')).toEqual({ preview: 4567, dev: 4667 })
    expect(portsByExample(servers).get('vike')).toEqual({ preview: 4572 })
  })

  it('keeps an example whose name contains a dash', () => {
    const servers = [
      { command: 'pnpm --filter ./examples/vue3-tailwind run story:preview', url: 'http://localhost:4571' },
    ]

    expect([...portsByExample(servers).keys()]).toEqual(['vue3-tailwind'])
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
    expect(onlyInFirst(['vue3', 'vike'], ['vue3'])).toEqual(['vike'])
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
    '| **Reference books** | `vue3`, `nuxt4`, `svelte5`, `sveltekit` — carry the full conformance set |',
    '| **Conformance books** | `quasar` — the conformance set only |',
    '| **Fixtures** | `vike`, `vue3-tailwind` — each exists for one narrow thing |',
  ].join('\n')

  it('reads both lists out of the guide table', () => {
    expect(guideExamples(table)).toEqual({
      reference: ['vue3', 'nuxt4', 'svelte5', 'sveltekit'],
      conformance: ['quasar'],
      fixtures: ['vike', 'vue3-tailwind'],
    })
  })

  it('ignores the prose beside the names, so a row can be reworded freely', () => {
    const reworded = table.replace('carry the full conformance set', 'carry every conformance story')

    expect(guideExamples(reworded).reference).toEqual(['vue3', 'nuxt4', 'svelte5', 'sveltekit'])
  })

  // Reported as a problem rather than passing vacuously: a renamed heading would
  // otherwise turn the guard off without failing anything.
  it('finds nothing when the table is gone', () => {
    expect(guideExamples('# Poveste\n\nNo table here.')).toEqual({ reference: [], conformance: [], fixtures: [] })
  })
})
