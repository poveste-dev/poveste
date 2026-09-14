import { afterEach, describe, expect, it } from 'vitest'
import { aliasesTaughtAlone, collect, externalHosts, installLineProblems, instructsWithHistoire, legacyOwnUrls, missingInstallLine, referencedWorkflows, unrunnableFences, walkProblems } from './check-readmes.ts'
import { removeTrees, tree } from './fixture-tree.ts'

// The heuristics below are the whole guard. Each case here is one that got
// past an earlier version of it, so a regression is a defect shipping again
// rather than a style change.

describe('instructsWithHistoire', () => {
  it('flags the instruction that shipped on two npm pages', () => {
    expect(instructsWithHistoire('Add the plugin in histoire config:')).toEqual([
      'Add the plugin in histoire config:',
    ])
  })

  it('flags it when the name is written in backticks', () => {
    // Stripping inline code hid this, which is the #294 defect one backtick away.
    expect(instructsWithHistoire('Add the plugin in `histoire` config:')).toHaveLength(1)
  })

  it('flags an instruction that also names a config file', () => {
    // Excluding any line containing `.config` switched the assertion off for
    // most configuration instructions, which is most of them.
    expect(instructsWithHistoire('Configure histoire in vite.config.ts')).toHaveLength(1)
  })

  it('allows the successor framing', () => {
    expect(instructsWithHistoire('Coming from histoire? Swap the dependency and add the plugin')).toEqual([])
  })

  // The word the project frames itself with, since #487 stopped it saying
  // "successor" about a project that is still shipping.
  it('allows the fork framing', () => {
    expect(instructsWithHistoire('This fork keeps the plugin you add in histoire working')).toEqual([])
  })

  it('allows the supported histoire.config.* filename', () => {
    expect(instructsWithHistoire('Add nothing: your histoire.config.ts keeps working')).toEqual([])
  })

  it('allows migration prose', () => {
    expect(instructsWithHistoire('To migrate, install poveste and configure it as histoire was')).toEqual([])
  })

  it('ignores fenced code, which the fence assertion covers', () => {
    expect(instructsWithHistoire('```sh\npnpm add histoire\n```')).toEqual([])
  })
})

describe('referencedWorkflows', () => {
  it('finds the workflow a badge names, once', () => {
    const badge = '[![Test](https://github.com/o/r/actions/workflows/test.yml/badge.svg)]'
      + '(https://github.com/o/r/actions/workflows/test.yml)'

    expect(referencedWorkflows(badge)).toEqual(['test.yml'])
  })

  it('ignores a workflow named inside a code fence', () => {
    // A README showing a consumer how to run Poveste in CI names workflows in
    // their repo, not this one.
    expect(referencedWorkflows('```yaml\n# .github/workflows/ci.yml\n```')).toEqual([])
  })
})

describe('externalHosts', () => {
  it('drops the punctuation that ends a sentence', () => {
    // `vite.dev,` is not `vite.dev`, and the allowlist only knows the latter.
    expect(externalHosts('See https://vite.dev, then https://vite.dev.')).toEqual(['vite.dev'])
  })

  it('skips a loopback example nobody follows', () => {
    expect(externalHosts('open http://localhost:3000')).toEqual([])
  })

  it('reads the host out of a markdown link', () => {
    expect(externalHosts('[docs](https://poveste.dev/guide/index.html)')).toEqual(['poveste.dev'])
  })
})

describe('aliasesTaughtAlone', () => {
  it('flags a page that teaches only the deprecated spelling', () => {
    expect(aliasesTaughtAlone('set process.env.HISTOIRE to true')).toEqual([
      { line: 1, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('passes a line that records the alias beside the canonical name', () => {
    expect(aliasesTaughtAlone('use process.env.POVESTE; process.env.HISTOIRE still works')).toEqual([])
  })

  it('flags a code sample on the alias even when prose elsewhere names the canonical', () => {
    const page = [
      'Use the `process.env.POVESTE` environment variable.',
      '',
      '```ts',
      'port: process.env.HISTOIRE ? 6006 : 3000,',
      '```',
    ].join('\n')

    expect(aliasesTaughtAlone(page)).toEqual([
      { line: 4, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('reports the line so the sample can be found', () => {
    const page = 'intro\n\ncolor: var(--histoire-contrast-color);\n'

    expect(aliasesTaughtAlone(page)).toEqual([
      { line: 3, deprecated: '--histoire-contrast-color', canonical: '--poveste-contrast-color' },
    ])
  })

  it('passes the migration table, which names both on one row', () => {
    const row = '| `--histoire-contrast-color` CSS var | still set (alongside `--poveste-contrast-color`) |'

    expect(aliasesTaughtAlone(row)).toEqual([])
  })
})

describe('installLineProblems', () => {
  const nuxtPeers = { '@poveste/plugin-vue': 'workspace:^', 'nuxt': '^4.5.0', 'poveste': 'workspace:^' }

  it('catches a framework plugin installed without poveste', () => {
    expect(installLineProblems('poveste-plugin-nuxt', 'pnpm add -D @poveste/plugin-nuxt', nuxtPeers))
      .toEqual(['packages/poveste-plugin-nuxt/README.md installs a framework plugin without poveste: pnpm add -D @poveste/plugin-nuxt'])
  })

  it('is satisfied once poveste is named', () => {
    expect(installLineProblems('p', 'pnpm add -D poveste @poveste/plugin-nuxt', nuxtPeers)).toEqual([])
  })

  // `@poveste/plugin-nuxt` contains the string "poveste" — the scoped name must
  // not be mistaken for the core package.
  it('does not accept a scoped package as the core one', () => {
    expect(installLineProblems('p', 'pnpm add -D @poveste/plugin-nuxt', nuxtPeers)).toHaveLength(1)
  })

  // plugin-percy and plugin-screenshot are add-ons for a project that already
  // has poveste, so omitting it there is deliberate.
  it('exempts an add-on with no framework peer', () => {
    expect(installLineProblems('poveste-plugin-percy', 'pnpm add -D @poveste/plugin-percy', { poveste: 'workspace:^' })).toEqual([])
  })

  // Only the first install line used to be checked, so a second bare one shipped
  // the very defect #389 fixed in plugin-nuxt.
  it('checks every install line, not just the first', () => {
    const readme = [
      '```bash',
      'pnpm add -D poveste @poveste/plugin-svelte   # Svelte',
      'pnpm add -D @poveste/plugin-svelte           # SvelteKit',
      '```',
    ].join('\n')

    expect(installLineProblems('poveste-plugin-svelte', readme, { svelte: '^5' })).toEqual([
      'packages/poveste-plugin-svelte/README.md installs a framework plugin without poveste: pnpm add -D @poveste/plugin-svelte           # SvelteKit',
    ])
  })

  it('reads the `pnpm i -D` spelling the core README uses', () => {
    expect(installLineProblems('p', 'pnpm i -D poveste @poveste/plugin-vue', { vue: '^3' })).toEqual([])
  })
})

describe('missingInstallLine', () => {
  it('catches a README whose only guidance is a config snippet', () => {
    const readme = '# x\n\n```ts\nexport default defineConfig({})\n```'

    expect(missingInstallLine('poveste-plugin-tailwind', readme))
      .toEqual(['packages/poveste-plugin-tailwind/README.md shows a config snippet but never says how to install the package'])
  })

  it('is satisfied by any install spelling, in any fence', () => {
    const readme = '```shell\npnpm i -D poveste\n```\n\n```ts\nexport default defineConfig({})\n```'

    expect(missingInstallLine('p', readme)).toEqual([])
  })

  it('says nothing about a README with no config snippet at all', () => {
    expect(missingInstallLine('p', '# x\n\nProse only.')).toEqual([])
  })
})

describe('unrunnableFences', () => {
  it('catches defineConfig used without being imported', () => {
    const readme = [
      '```ts',
      `import { HstTailwind } from '@poveste/plugin-tailwind'`,
      '',
      'export default defineConfig({})',
      '```',
    ].join('\n')

    expect(unrunnableFences('packages/p/README.md', readme))
      .toEqual(['packages/p/README.md has a code block calling defineConfig without importing it — readers copy this'])
  })

  it('is satisfied when the import is there, whatever else it imports', () => {
    const readme = [
      '```ts',
      `import { HstVue } from '@poveste/plugin-vue'`,
      `import { defineConfig } from 'poveste'`,
      '',
      'export default defineConfig({})',
      '```',
    ].join('\n')

    expect(unrunnableFences('p', readme)).toEqual([])
  })

  // A fence that only mentions the name in prose or a different call is fine.
  it('ignores a fence that never calls defineConfig', () => {
    expect(unrunnableFences('p', '```ts\nexport default { plugins: [] }\n```')).toEqual([])
  })
})

describe('aliasesTaughtAlone in a diff fence', () => {
  const rename = [
    '```diff',
    '- port: process.env.HISTOIRE ? 6006 : 3000,',
    '+ port: process.env.POVESTE ? 6006 : 3000,',
    '```',
  ].join('\n')

  // A `-` line names the old spelling by construction, so the line cannot be the
  // unit here. This is the established style on the migration guide (#358).
  it('accepts a diff block that shows the rename', () => {
    expect(aliasesTaughtAlone(rename)).toEqual([])
  })

  // The fence is not a blanket exemption — a removal that never introduces the
  // canonical spelling is still teaching the alias alone.
  it('still flags a diff block that only ever names the alias', () => {
    const removal = ['```diff', '- port: process.env.HISTOIRE ? 6006 : 3000,', '+ port: 3000,', '```'].join('\n')

    expect(aliasesTaughtAlone(removal)).toEqual([
      { line: 1, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  // The defect this whole check exists for (#292) has to keep failing.
  it('still flags a ts sample built on the alias', () => {
    const sample = ['```ts', 'export default { port: process.env.HISTOIRE }', '```'].join('\n')

    expect(aliasesTaughtAlone(sample)).toEqual([
      { line: 2, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('still flags prose outside any fence', () => {
    expect(aliasesTaughtAlone('Set process.env.HISTOIRE to pick the port.')).toHaveLength(1)
  })

  it('reports a bad diff block once, at the fence, not once per line', () => {
    const twice = [
      '```diff',
      '- a: process.env.HISTOIRE,',
      '- b: process.env.HISTOIRE,',
      '```',
    ].join('\n')

    expect(aliasesTaughtAlone(twice)).toEqual([
      { line: 1, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('keeps counting lines correctly after a fence closes', () => {
    const doc = [rename, '', 'Then set process.env.HISTOIRE by hand.'].join('\n')

    expect(aliasesTaughtAlone(doc)).toEqual([
      { line: 6, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })
})

describe('legacyOwnUrls', () => {
  // The 24 that shipped. `externalHosts` stops at the first slash, so the host
  // was right and the path was never looked at (#731).
  it('finds a .html link to our own site', () => {
    expect(legacyOwnUrls('[docs](https://poveste.dev/guide/getting-started.html)')).toEqual([
      'https://poveste.dev/guide/getting-started.html',
    ])
  })

  it('finds one carrying a fragment, which is how most of them were written', () => {
    expect(legacyOwnUrls('see [versions](https://poveste.dev/guide/getting-started.html#supported-versions)')).toEqual([
      'https://poveste.dev/guide/getting-started.html#supported-versions',
    ])
  })

  it('is silent on the clean spelling', () => {
    expect(legacyOwnUrls('[docs](https://poveste.dev/guide/getting-started#supported-versions)')).toEqual([])
  })

  // Whether someone else's site serves `.html` is their business, and not
  // knowable from here.
  it('ignores another host entirely', () => {
    expect(legacyOwnUrls('[vite](https://vite.dev/config/index.html)')).toEqual([])
  })

  // `.html` has to be the page, not a substring of one.
  it('does not fire on a path that merely contains the letters', () => {
    expect(legacyOwnUrls('[x](https://poveste.dev/guide/htmlx)')).toEqual([])
  })

  it('reports each distinct link once, however often it appears', () => {
    const twice = '[a](https://poveste.dev/guide/css.html) and [b](https://poveste.dev/guide/css.html)'

    expect(legacyOwnUrls(twice)).toHaveLength(1)
  })
})

// Everything above this line asserts predicates against strings, which is the
// half that was already covered. These read the tree (#719).

afterEach(removeTrees)

function MANIFEST(name: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name, version: '1.0.0', ...extra })
}

describe('collect', () => {
  it('finds a published package README and marks it as a package page', async () => {
    const root = tree({
      'README.md': '# root',
      'packages/one/package.json': MANIFEST('@fixture/one', { peerDependencies: { vue: '^3' } }),
      'packages/one/README.md': '# one',
    })

    const { pages, published } = await collect(root)

    expect(published).toBe(1)
    expect(pages.find(page => page.label === '@fixture/one')?.pkg).toEqual({ entry: 'one', peers: { vue: '^3' } })
  })

  it('passes over a private package rather than counting it as published', async () => {
    const root = tree({
      'README.md': '# root',
      'packages/hidden/package.json': MANIFEST('@fixture/hidden', { private: true }),
      'packages/hidden/README.md': '# hidden',
    })

    expect((await collect(root)).published).toBe(0)
  })

  // npm renders "This package does not have a README" for these, which is the
  // defect #184 is about.
  it('names a published package with no README rather than skipping it', async () => {
    const root = tree({ 'README.md': '# root', 'packages/bare/package.json': MANIFEST('@fixture/bare') })

    expect((await collect(root)).withoutReadme).toEqual(['@fixture/bare'])
  })

  it('reaches example READMEs and both template directories', async () => {
    const root = tree({
      'README.md': '# root',
      'examples/demo/README.md': '# demo',
      '.github/ISSUE_TEMPLATE/bug-report.yml': 'name: bug',
      '.github/DISCUSSION_TEMPLATE/q-a.yml': 'name: q-a',
    })

    expect((await collect(root)).pages.map(page => page.label)).toEqual([
      'README.md',
      'examples/demo',
      '.github/ISSUE_TEMPLATE/bug-report.yml',
      '.github/DISCUSSION_TEMPLATE/q-a.yml',
    ])
  })
})

describe('walkProblems', () => {
  it('is silent over a tree with pages and a published package', async () => {
    const root = tree({
      'README.md': '# root',
      'packages/one/package.json': MANIFEST('@fixture/one'),
      'packages/one/README.md': '# one',
    })

    expect(walkProblems(await collect(root))).toEqual([])
  })

  // The state every check in scripts/ was in until #719: reaches nothing,
  // compares nothing, exits 0.
  it('fails when the walk reaches pages but no published package', async () => {
    // A tree with no `packages/` at all, which is what a moved or renamed
    // directory looks like from here: `readdir` reports nothing, every npm page
    // assertion below has no page to run against, and the check would otherwise
    // print a success line with a zero in it.
    const root = tree({ 'README.md': '# root' })

    expect(walkProblems(await collect(root))).toEqual([
      expect.stringContaining('found no published packages'),
    ])
  })

  it('fails when there are no pages at all', () => {
    expect(walkProblems({ pages: [], published: 0, withoutReadme: [] })).toEqual([
      expect.stringContaining('no pages to read at all'),
      expect.stringContaining('found no published packages'),
    ])
  })
})
