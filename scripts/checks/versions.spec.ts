import { describe, expect, it } from 'vitest'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'
import { checkVersions, citedJobProblems, collect, docsNodeProblems, engineFloorProblems, jobNames, nodeClaimProblems, nodeClaims, nodeFloorReachProblems, parseTable, readmeRangeProblems, specMinimum, tableProblems, walkProblems } from './versions.ts'

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

  // It read only the first claim, so a README stating the range twice had its
  // second statement unchecked.
  it('checks every claim, not only the first', () => {
    expect(nodeClaimProblems('poveste', `Node \`${engines}\`, and later Node \`>=26\`.`, engines)).toHaveLength(1)
  })
})

describe('nodeClaims', () => {
  it.each(['>=24.15.0', '^24.15.0', '24', 'v26.1', '>= 24.15.0'])('reads Node `%s` as a claim', (range) => {
    expect(nodeClaims(`Poveste needs Node \`${range}\`.`)).toEqual([range])
  })

  it.each(['fs', '--experimental-strip-types', 'process.versions.node'])('reads Node `%s` as prose', (token) => {
    expect(nodeClaims(`the Node \`${token}\` module`)).toEqual([])
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
      '        example: [vue, nuxt, svelte]',
      `    name: Example e2e ($\u007B{ matrix.example }})`,
    ].join('\n')

    expect([...jobNames([yaml])]).toEqual([
      'Example e2e (vue)',
      'Example e2e (nuxt)',
      'Example e2e (svelte)',
    ])
  })

  it('keeps a plain job name as it is', () => {
    expect(jobNames([['jobs:', '  floor:', '    name: Node floor'].join('\n')]).has('Node floor')).toBe(true)
  })

  // `with: name:` on an upload-artifact step is not a job. Collecting those put
  // `packages-dist` and `playwright-traces-vue` in the set of real CI checks.
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
      '        example: [vue, nuxt]',
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
  const jobs = new Set(['Node floor', 'Example e2e (vue)'])
  const table = (row: string) => ['| | Supported | Proven by |', '| --- | --- | --- |', row].join('\n')

  it('catches a row crediting a job that no longer exists', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `Vue 3 tests` — build + Playwright |'

    expect(citedJobProblems('docs/guide/getting-started.md', table(row), jobs)).toEqual([
      'docs/guide/getting-started.md says Vue 3 tests proves a range, but no CI job has that name',
    ])
  })

  it('accepts a row naming a real job', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `Example e2e (vue)` — builds that book |'

    expect(citedJobProblems('f', table(row), jobs)).toEqual([])
  })

  // The evidence column also names directories; those are not job names.
  it('skips a backticked path', () => {
    const row = '| [Vue](https://vuejs.org) | `^3.5.26` | `examples/vue` — `Example e2e (vue)` |'

    expect(citedJobProblems('f', table(row), jobs)).toEqual([])
  })

  // The SvelteKit row credited a tool that exists as a script and in no
  // workflow, which is a different failure from a renamed job.
  it('catches a tool credited as if it were a job', () => {
    const row = '| [SvelteKit](https://svelte.dev) | `^2.53.0` | build + `svelte-check` |'

    expect(citedJobProblems('f', table(row), jobs)).toHaveLength(1)
  })
})

// Everything above asserts predicates against strings. These read the tree
// (#719): the half that finds the workflows and the package READMEs was
// asserted nowhere, and either half going empty is silent.

function pkg(name: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name, version: '1.0.0', ...extra })
}

describe('collect', () => {
  it('reads workflow contents rather than only their names', async () => {
    const root = tree({ '.github/workflows/test.yml': 'jobs:\n  build:\n    name: Build\n' })

    expect(jobNames((await collect(root)).workflows)).toContain('Build')
  })

  it('passes over a file in the workflow directory that is not a workflow', async () => {
    const root = tree({ '.github/workflows/test.yml': 'jobs:\n', '.github/workflows/notes.md': 'jobs:\n  x:\n    name: Nope\n' })

    expect((await collect(root)).workflows).toHaveLength(1)
  })

  it('pairs each package README with its manifest', async () => {
    const root = tree({
      'packages/one/package.json': pkg('@fixture/one', { peerDependencies: { vue: '^3' } }),
      'packages/one/README.md': '# one',
    })

    expect((await collect(root)).packages).toEqual([
      { entry: 'one', readme: '# one', manifest: expect.objectContaining({ name: '@fixture/one' }) },
    ])
  })

  it('reads every docs page, nested ones included, by its path from the root', async () => {
    const root = tree({ 'docs/index.md': '# home', 'docs/guide/vue/getting-started.md': '# vue' })

    expect((await collect(root)).docs.map(({ file }) => file).sort()).toEqual(['docs/guide/vue/getting-started.md', 'docs/index.md'])
  })

  it('passes over installed dependencies and the site\'s own dot-directories', async () => {
    const root = tree({ 'docs/index.md': '# home', 'docs/node_modules/x/README.md': 'Node `18`', 'docs/.vitepress/cache/a.md': 'Node `18`' })

    expect((await collect(root)).docs.map(({ file }) => file)).toEqual(['docs/index.md'])
  })

  // A package with no README has nothing to compare and is not this check's
  // defect to report — `checks/readmes` owns that one.
  it('passes over a package with a manifest and no README', async () => {
    const root = tree({ 'packages/bare/package.json': pkg('@fixture/bare') })

    expect((await collect(root)).packages).toEqual([])
  })
})

describe('walkProblems', () => {
  const PAGE = { 'docs/index.md': '# docs' }

  it('is silent when every part read something', async () => {
    const root = tree({
      '.github/workflows/test.yml': 'jobs:\n',
      'packages/one/package.json': pkg('@fixture/one'),
      'packages/one/README.md': '# one',
      ...PAGE,
    })

    expect(walkProblems(await collect(root))).toEqual([])
  })

  it('fails when no workflow was read, since every cited job would resolve against nothing', async () => {
    const root = tree({ 'packages/one/package.json': pkg('@fixture/one'), 'packages/one/README.md': '# one', ...PAGE })

    expect(walkProblems(await collect(root))).toEqual([expect.stringContaining('held no workflow files')])
  })

  it('fails when no package was read, since the per-README assertions examined nothing', async () => {
    const root = tree({ '.github/workflows/test.yml': 'jobs:\n', ...PAGE })

    expect(walkProblems(await collect(root))).toEqual([expect.stringContaining('held no package with both')])
  })

  it('fails when no docs page was read, since no stated Node was checked', async () => {
    const root = tree({ '.github/workflows/test.yml': 'jobs:\n', 'packages/one/package.json': pkg('@fixture/one'), 'packages/one/README.md': '# one' })

    expect(walkProblems(await collect(root))).toEqual([expect.stringContaining('docs/ held no markdown page')])
  })
})

describe('checkVersions', () => {
  // `expectations()` reads these five manifests before anything reaches the walk,
  // and throws on a missing one. They carry no README, so the walk still finds no
  // package to check and its own floor is what reports.
  const PEER_MANIFESTS = {
    'packages/poveste/package.json': '{ "engines": { "node": ">=26" }, "peerDependencies": { "vite": "^8" } }',
    'packages/poveste-plugin-vue/package.json': '{ "peerDependencies": { "vue": "^3" } }',
    'packages/poveste-plugin-nuxt/package.json': '{ "peerDependencies": { "nuxt": "^4" } }',
    'packages/poveste-plugin-svelte/package.json': '{ "peerDependencies": { "svelte": "^5", "@sveltejs/kit": "^2" } }',
    'packages/poveste-plugin-quasar/package.json': '{ "peerDependencies": { "quasar": "^2", "@quasar/app-vite": "^2" } }',
  }

  it('reports that there is no workflow to cite a job from', async () => {
    const root = tree({
      'README.md': '# t\n',
      'docs/guide/getting-started.md': '# t\n',
      '.github/workflows/': '',
      ...PEER_MANIFESTS,
    })

    expect((await checkVersions(root)).problems).toContainEqual(expect.stringContaining('held no workflow files'))
  })

  it('the version tables match what the packages declare', { tags: ['check', 'versions'] }, async () => {
    assertNoProblems(await checkVersions())
  })
})

describe('engineFloorProblems', () => {
  it('accepts a single `>=` floor, which no Node above it can fall out of', () => {
    expect(engineFloorProblems('poveste', '>=22.22.2')).toEqual([])
  })

  // The range 0.15.0 published. `24.13.0`, what fnm installs as `lts-latest`, sits
  // between its second and third clause, and npm answered with `poveste@0.6.1`.
  it('rejects a range with a gap a released Node falls into', () => {
    expect(engineFloorProblems('poveste', '^22.22.2 || ^24.15.0 || >=26.0.0')).toEqual([
      'packages/poveste/package.json declares engines.node `^22.22.2 || ^24.15.0 || >=26.0.0`, which is not a single `>=` floor: a Node above it that the range rejects installs an ancient version instead of failing (#901)',
    ])
  })

  it('rejects an upper bound, which dates the same way', () => {
    expect(engineFloorProblems('poveste', '>=22.22.2 <30')).toHaveLength(1)
  })

  // A published package with no field at all is what npm resolves *back to*: the
  // absent `engines` is read as accepting every Node, which is why `0.6.1` is the
  // version #901 lands on.
  it('rejects a published package that declares no engines at all', () => {
    expect(engineFloorProblems('poveste-plugin-vue', undefined)).toEqual([
      'packages/poveste-plugin-vue/package.json declares no engines.node: npm reads that as accepting every Node, which is what makes a published version the one an unsupported Node resolves back to (#901)',
    ])
  })
})

describe('specMinimum', () => {
  it.each([
    ['^24.15.0', '24.15.0'],
    ['>=24.15.0', '24.15.0'],
    ['24.x', '24.0.0'],
    ['18.x', '18.0.0'],
    ['24', '24.0.0'],
    ['v26.1', '26.1.0'],
  ])('reads %s as able to install %s', (spec, minimum) => {
    expect(specMinimum(spec)).toBe(minimum)
  })

  it.each(['lts/*', 'node', '>=24 <26', '24.15.0.1'])('cannot read %s, rather than guessing', (spec) => {
    expect(specMinimum(spec)).toBeUndefined()
  })
})

describe('docsNodeProblems', () => {
  const ENGINES = '>=24.15.0'
  const recipe = (version: string) => `\`\`\`yaml\n      - uses: actions/setup-node@v7\n        with:\n          node-version: ${version}\n\`\`\`\n`

  // The defect: the lost-pixel recipe kept `18.x` three majors after the floor
  // moved, and a reader running it got an older Poveste without an error (#1102).
  it('catches a recipe that can install a Node under the floor', () => {
    expect(docsNodeProblems('docs/recipe.md', recipe('18.x'), ENGINES)).toEqual([
      'docs/recipe.md:4 sets node-version 18.x, which can install Node 18.0.0, under the 24.15.0 that engines.node requires',
    ])
  })

  it('catches `24.x`, which claims the 24.0–24.14 that npm walks back from', () => {
    expect(docsNodeProblems('docs/recipe.md', recipe('24.x'), ENGINES)).toHaveLength(1)
  })

  it('accepts a recipe whose lowest installable Node is the floor', () => {
    expect(docsNodeProblems('docs/recipe.md', recipe(`'^24.15.0'`), ENGINES)).toEqual([])
  })

  it('reports a spec it cannot read rather than passing it', () => {
    expect(docsNodeProblems('docs/recipe.md', recipe('lts/*'), ENGINES)).toEqual([expect.stringContaining('cannot be read as a version')])
  })

  it('catches prose stating a different range', () => {
    expect(docsNodeProblems('docs/page.md', 'Poveste needs Node `>=22.22.2`.', ENGINES)).toEqual([
      'docs/page.md says Node >=22.22.2, but packages/poveste/package.json → engines.node says >=24.15.0',
    ])
  })

  it('is silent when prose states the range itself', () => {
    expect(docsNodeProblems('docs/page.md', 'Poveste needs Node `>=24.15.0`.', ENGINES)).toEqual([])
  })
})

describe('nodeFloorReachProblems', () => {
  it('catches a framework getting-started page that states no floor', () => {
    expect(nodeFloorReachProblems('docs/guide/solid/getting-started.md', '# Getting started')).toEqual([
      'docs/guide/solid/getting-started.md does not state the Node floor, and it is a page a reader installs from',
    ])
  })

  it('is satisfied by a page that states one', () => {
    expect(nodeFloorReachProblems('docs/guide/solid/getting-started.md', '::: warning Poveste needs Node `>=24.15.0`')).toEqual([])
  })

  it('does not require it of other pages', () => {
    expect(nodeFloorReachProblems('docs/guide/solid/stories.md', '# Stories')).toEqual([])
  })
})
