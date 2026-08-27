import { describe, expect, it } from 'vitest'
import {
  asServers,
  duplicatePorts,
  exampleNames,
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
