import { describe, expect, it } from 'vitest'
import { checkSmokePlugins, hasPass, listedPlugins, pluginProblems, publishedPlugins, SMOKE_TEST } from './smoke-plugins.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const SCRIPT = `
PLUGIN_PACKAGES=(
  "poveste-plugin-vue"
  "poveste-plugin-svelte"
)

install_and_build vue "$VUE_APP" "$(plugin_tgz poveste-plugin-vue)"
install_and_build svelte "$SVELTE_APP" "$(plugin_tgz poveste-plugin-svelte)"
`

describe('the published plugin set', () => {
  it('is derived from the manifests rather than a list', () => {
    const root = tree({
      'packages/poveste-plugin-vue/package.json': JSON.stringify({ name: '@poveste/plugin-vue' }),
      'packages/poveste-plugin-svelte/package.json': JSON.stringify({ name: '@poveste/plugin-svelte' }),
      'packages/poveste/package.json': JSON.stringify({ name: 'poveste' }),
    })

    expect(publishedPlugins(root)).toEqual(['poveste-plugin-svelte', 'poveste-plugin-vue'])
  })

  it('leaves out a private package, which is published to nobody', () => {
    const root = tree({
      'packages/poveste-plugin-vue/package.json': JSON.stringify({ name: '@poveste/plugin-vue' }),
      'packages/poveste-plugin-lab/package.json': JSON.stringify({ name: '@poveste/plugin-lab', private: true }),
    })

    expect(publishedPlugins(root)).toEqual(['poveste-plugin-vue'])
  })
})

describe('reading the script', () => {
  it('takes the names out of PLUGIN_PACKAGES', () => {
    expect(listedPlugins(SCRIPT)).toEqual(['poveste-plugin-svelte', 'poveste-plugin-vue'])
  })

  it('sees a pass by the tarball it installs', () => {
    expect(hasPass(SCRIPT, 'poveste-plugin-vue')).toBe(true)
    expect(hasPass(SCRIPT, 'poveste-plugin-nuxt')).toBe(false)
  })
})

describe('holding the two together', () => {
  it('is quiet when every published plugin has a pass', () => {
    expect(pluginProblems(['poveste-plugin-svelte', 'poveste-plugin-vue'], SCRIPT)).toEqual([])
  })

  // #1052: three of seven, and the four missing ones were invisible because the
  // pass list is a list.
  it('names a published plugin with no pass', () => {
    expect(pluginProblems(['poveste-plugin-nuxt', 'poveste-plugin-vue', 'poveste-plugin-svelte'], SCRIPT))
      .toEqual([`poveste-plugin-nuxt is published and has no pass in ${SMOKE_TEST}`])
  })

  /*
   * The half that is not obvious, and the state I put the script into while
   * writing this: `PLUGIN_PACKAGES` drives `pnpm pack`, so a name added there
   * without a pass produces a tarball nothing installs — and reads as coverage
   * in the one place anyone looks.
   */
  it('names a plugin that is packed and never installed', () => {
    const packedOnly = SCRIPT.replace('"poveste-plugin-svelte"', '"poveste-plugin-svelte"\n  "poveste-plugin-nuxt"')

    expect(pluginProblems(['poveste-plugin-nuxt', 'poveste-plugin-svelte', 'poveste-plugin-vue'], packedOnly))
      .toEqual([`poveste-plugin-nuxt is packed by ${SMOKE_TEST} and never installed by a pass`])
  })

  it('names a listed plugin that is not published', () => {
    const extra = SCRIPT.replace('"poveste-plugin-vue"', '"poveste-plugin-vue"\n  "poveste-plugin-gone"')

    expect(pluginProblems(['poveste-plugin-svelte', 'poveste-plugin-vue'], extra))
      .toContainEqual(`${SMOKE_TEST} packs poveste-plugin-gone, which is not a published plugin`)
  })

  it('reports rather than passes when it cannot find the array at all', () => {
    expect(pluginProblems(['poveste-plugin-vue'], 'nothing to read here'))
      .toEqual([`${SMOKE_TEST} declares no \`PLUGIN_PACKAGES\` — this check is reading the wrong thing`])
  })
})

describe('the repository', () => {
  it('runs a consumer-install pass for every published plugin', { tags: ['check', 'release'] }, () => {
    assertNoProblems(checkSmokePlugins())
  })

  it('reports rather than passes when it finds no plugin at all', () => {
    expect(checkSmokePlugins(tree({ 'packages/poveste/package.json': JSON.stringify({ name: 'poveste' }) })).problems)
      .toContainEqual(expect.stringContaining('no published plugin found under packages/'))
  })
})
