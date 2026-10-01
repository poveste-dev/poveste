import { describe, expect, it } from 'vitest'
import { checkSmokePlugins, EXEMPT, hasPass, listedPlugins, pluginProblems, publishedPlugins, SMOKE_TEST } from './smoke-plugins.ts'
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

  /*
   * `\b` would have said yes here, because `-` is a word boundary: a plugin whose
   * name is a prefix of another's would read as covered by that other pass. No two
   * published names are a prefix of each other today, which is why nothing would
   * have noticed until the pair existed — in the one check whose job is to have no
   * silent holes.
   */
  it('does not take a longer plugin name as this plugin covered', () => {
    const longerOnly = 'install_and_build x "$(plugin_tgz poveste-plugin-vue-router)"'

    expect(hasPass(longerOnly, 'poveste-plugin-vue-router')).toBe(true)
    expect(hasPass(longerOnly, 'poveste-plugin-vue')).toBe(false)
  })

  it('sees a quoted name, which is how the loop-free passes spell it', () => {
    expect(hasPass('"$(plugin_tgz "poveste-plugin-percy")"', 'poveste-plugin-percy')).toBe(true)
  })
})

const EXEMPT_FIXTURE = { 'poveste-plugin-shot': 'needs a browser CI does not provide (#654)' }

describe('holding the two together', () => {
  it('is quiet when every published plugin has a pass', () => {
    expect(pluginProblems(['poveste-plugin-svelte', 'poveste-plugin-vue'], SCRIPT, {})).toEqual([])
  })

  // #1052: three of seven, and the four missing ones were invisible because the
  // pass list is a list.
  it('names a published plugin with no pass', () => {
    expect(pluginProblems(['poveste-plugin-nuxt', 'poveste-plugin-vue', 'poveste-plugin-svelte'], SCRIPT, {}))
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

    expect(pluginProblems(['poveste-plugin-nuxt', 'poveste-plugin-svelte', 'poveste-plugin-vue'], packedOnly, {}))
      .toEqual([`poveste-plugin-nuxt is packed by ${SMOKE_TEST} and never installed by a pass`])
  })

  it('names a listed plugin that is not published', () => {
    const extra = SCRIPT.replace('"poveste-plugin-vue"', '"poveste-plugin-vue"\n  "poveste-plugin-gone"')

    expect(pluginProblems(['poveste-plugin-svelte', 'poveste-plugin-vue'], extra, {}))
      .toContainEqual(`${SMOKE_TEST} packs poveste-plugin-gone, which is not a published plugin`)
  })

  /*
   * The third problem, and the one an exemption invites: a plugin that genuinely
   * cannot have a pass is fine, and an exemption nobody revisits is how a hole
   * gets called a policy. So both directions fail — a plugin that is exempt *and*
   * covered, and an exemption for something no longer published.
   */
  it('names an exemption that has been overtaken by a pass', () => {
    const covered = SCRIPT.replace('"poveste-plugin-vue"', '"poveste-plugin-vue"\n  "poveste-plugin-shot"')

    expect(pluginProblems(['poveste-plugin-shot', 'poveste-plugin-svelte', 'poveste-plugin-vue'], covered, EXEMPT_FIXTURE))
      .toContainEqual(`poveste-plugin-shot has a pass in ${SMOKE_TEST} and an exemption here — one of the two is stale`)
  })

  it('names an exemption for a plugin that is no longer published', () => {
    expect(pluginProblems(['poveste-plugin-svelte', 'poveste-plugin-vue'], SCRIPT, EXEMPT_FIXTURE))
      .toContainEqual('poveste-plugin-shot is exempt here and is not a published plugin — the exemption has outlived its subject')
  })

  it('is quiet about an exempt plugin that is published and has no pass', () => {
    expect(pluginProblems(['poveste-plugin-shot', 'poveste-plugin-svelte', 'poveste-plugin-vue'], SCRIPT, EXEMPT_FIXTURE))
      .toEqual([])
  })

  // A reason that does not say what makes a pass impossible is an excuse.
  it('gives every exemption a reason naming the constraint', () => {
    for (const [plugin, reason] of Object.entries(EXEMPT)) {
      expect(reason, `${plugin}'s exemption has no reason`).not.toHaveLength(0)
      expect(reason, `${plugin}'s exemption cites no issue`).toMatch(/#\d+/)
    }
  })

  it('reports rather than passes when it cannot find the array at all', () => {
    expect(pluginProblems(['poveste-plugin-vue'], 'nothing to read here', {}))
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
