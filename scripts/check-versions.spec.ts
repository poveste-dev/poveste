import { describe, expect, it } from 'vitest'
import { citedJobProblems, jobNames, nodeClaimProblems, parseTable, readmeRangeProblems, tableProblems } from './check-versions.ts'

// The defect this guard exists for is #148: the README advertised `svelte ^5.0.0`
// while the plugin declared `^5.46.4`, inviting a combination that cannot be
// assembled at all.

const EXPECTED = [
  { label: 'Svelte', expected: '^5.46.4', source: 'packages/poveste-plugin-svelte/package.json → peerDependencies["svelte"]' },
]

describe('parseTable', () => {
  it('reads a label out of its markdown link and a range out of its backticks', () => {
    const table = parseTable('README.md', '| [Svelte](https://svelte.dev) | `^5.46.4` | proven by a job |')

    expect(table.rows.get('Svelte')).toBe('^5.46.4')
  })

  it('drops the asterisk a footnoted row carries', () => {
    const table = parseTable('README.md', '| [Svelte](https://svelte.dev)* | `^5.46.4` | … |')

    expect(table.rows.get('Svelte')).toBe('^5.46.4')
  })

  // A range like `^22 \| ^24` splits the row if the escape is not honoured.
  it('keeps an escaped pipe inside a range instead of splitting the cell on it', () => {
    const table = parseTable('README.md', '| [Node](https://nodejs.org) | `^22.22.2 \\| ^24.15.0` | … |')

    expect(table.rows.get('Node')).toBe('^22.22.2 | ^24.15.0')
  })

  it('ignores prose between tables', () => {
    const table = parseTable('README.md', 'Some prose.\n\n| Vite | `^8.0.0` |')

    expect([...table.rows.keys()]).toEqual(['Vite'])
  })

  // Both files carry a header row, and `| --- |` would otherwise become a row.
  it('keeps the first value for a label rather than letting a later table win', () => {
    const table = parseTable('README.md', '| Vite | `^8.0.0` |\n| Vite | `^7.0.0` |')

    expect(table.rows.get('Vite')).toBe('^8.0.0')
  })
})

describe('tableProblems', () => {
  it('is silent when the documented range matches what is declared', () => {
    const table = parseTable('README.md', '| Svelte | `^5.46.4` |')

    expect(tableProblems(table, EXPECTED)).toEqual([])
  })

  it('names both ranges when the table has drifted', () => {
    const table = parseTable('README.md', '| Svelte | `^5.0.0` |')

    expect(tableProblems(table, EXPECTED)).toEqual([
      expect.stringContaining('README.md says Svelte ^5.0.0, but'),
    ])
  })

  it('reports a row that is missing entirely rather than passing over it', () => {
    const table = parseTable('README.md', '| Vite | `^8.0.0` |')

    expect(tableProblems(table, EXPECTED)).toEqual([
      expect.stringContaining('has no "Svelte" row'),
    ])
  })
})

describe('readmeRangeProblems', () => {
  it('catches a package README advertising a range its own peers contradict', () => {
    const problems = readmeRangeProblems('poveste-plugin-svelte', 'Requires `svelte@^5.0.0`.', { svelte: '^5.46.4' })

    expect(problems).toEqual([
      'packages/poveste-plugin-svelte/README.md says svelte@^5.0.0, but its own peerDependencies say ^5.46.4',
    ])
  })

  it('is silent when they agree', () => {
    expect(readmeRangeProblems('p', 'Requires `svelte@^5.46.4`.', { svelte: '^5.46.4' })).toEqual([])
  })

  // An install line names a package the plugin does not peer on, and saying
  // nothing about it is the point — otherwise every README mention is a rule.
  it('ignores a package that this one does not peer on at all', () => {
    expect(readmeRangeProblems('p', 'Install `poveste@^0.11.0`.', { svelte: '^5.46.4' })).toEqual([])
  })
})

describe('nodeClaimProblems', () => {
  const engines = '^22.22.2 || ^24.15.0 || >=26.0.0'

  // The core package's npm page turned away two majors a CI job proves (#389).
  it('catches a README stating a narrower range than the manifest', () => {
    expect(nodeClaimProblems('poveste', 'Node `>=26` and Vite `^8.0.0`.', engines)).toEqual([
      'packages/poveste/README.md says Node >=26, but its own engines.node says ^22.22.2 || ^24.15.0 || >=26.0.0',
    ])
  })

  it('is silent when they agree', () => {
    expect(nodeClaimProblems('poveste', `Node \`${engines}\`.`, engines)).toEqual([])
  })

  it('says nothing about a README that makes no Node claim', () => {
    expect(nodeClaimProblems('p', 'Vite `^8.0.0` only.', engines)).toEqual([])
  })

  it('says nothing when the package declares no engines', () => {
    expect(nodeClaimProblems('p', 'Node `>=26`.', undefined)).toEqual([])
  })
})

describe('jobNames', () => {
  // #217 collapsed four per-framework workflows into one matrix job, which is
  // what made the documented names stale (#392).
  it('expands a matrix job into one name per example', () => {
    const yaml = [
      'jobs:',
      '  e2e:',
      '    strategy:',
      '      matrix:',
      '        example: [vue3, nuxt4, svelte5]',
      `    name: Example e2e ($\u007B{ matrix.example }})`,
    ].join('\n')

    expect([...jobNames([yaml])]).toEqual([
      'Example e2e (vue3)',
      'Example e2e (nuxt4)',
      'Example e2e (svelte5)',
    ])
  })

  it('keeps a plain job name as it is', () => {
    expect(jobNames([['jobs:', '  floor:', '    name: Node floor'].join('\n')]).has('Node floor')).toBe(true)
  })

  // `with: name:` on an upload-artifact step is not a job. Collecting those put
  // `packages-dist` and `playwright-traces-vue3` in the set of real CI checks.
  it('ignores an artifact name from a step', () => {
    const yaml = [
      'jobs:',
      '  build:',
      '    name: Build',
      '    steps:',
      '      - uses: actions/upload-artifact@v4',
      '        with:',
      '          name: packages-dist',
    ].join('\n')

    expect([...jobNames([yaml])]).toEqual(['Build'])
  })

  // The name says which matrix variable it interpolates; expanding it with a
  // different one's values invents names no check will ever have.
  it('expands a job with the matrix variable its own name uses', () => {
    const yaml = [
      'jobs:',
      '  e2e:',
      '    strategy:',
      '      matrix:',
      '        example: [vue3, nuxt4]',
      '        os: [ubuntu, windows]',
      `    name: Collection ($\u007B{ matrix.os }})`,
    ].join('\n')

    expect([...jobNames([yaml])]).toEqual(['Collection (ubuntu)', 'Collection (windows)'])
  })

  it('strips quotes a workflow may put round a name', () => {
    const yaml = ['jobs:', '  collect:', '    name: "Collection (windows)"'].join('\n')

    expect(jobNames([yaml]).has('Collection (windows)')).toBe(true)
  })
})

describe('citedJobProblems', () => {
  const jobs = new Set(['Node floor', 'Example e2e (vue3)'])
  const table = (row: string) => ['| | Supported | Proven by |', '| --- | --- | --- |', row].join('\n')

  it('catches a row crediting a job that no longer exists', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `Vue 3 tests` — build + Playwright |'

    expect(citedJobProblems('docs/guide/getting-started.md', table(row), jobs)).toEqual([
      'docs/guide/getting-started.md says Vue 3 tests proves a range, but no CI job has that name',
    ])
  })

  it('accepts a row naming a real job', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `Example e2e (vue3)` — builds that book |'

    expect(citedJobProblems('f', table(row), jobs)).toEqual([])
  })

  // The evidence column also names directories; those are not job names.
  it('skips a backticked path', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `examples/vue3` — `Example e2e (vue3)` |'

    expect(citedJobProblems('f', table(row), jobs)).toEqual([])
  })

  // The SvelteKit row credited a tool that exists as a script and in no
  // workflow, which is a different failure from a renamed job.
  it('catches a tool credited as if it were a job', () => {
    const row = '| [SvelteKit](https://svelte.dev) | `^2.53.0` | build + `svelte-check` |'

    expect(citedJobProblems('f', table(row), jobs)).toHaveLength(1)
  })
})
