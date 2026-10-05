import { mkdirSync, mkdtempDisposableSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it, onTestFinished } from 'vitest'
import { collapseVendoredVue, nodeResolver, satisfiesCaret, vendoredAliases } from '../vendors.js'

// macOS reports `/var` and hands back `/private/var`, which resolution accepts and a
// path comparison does not.
function tempRoot() {
  const dir = mkdtempDisposableSync(join(tmpdir(), 'poveste-vendors-'))
  onTestFinished(() => dir.remove())
  return realpathSync(dir.path)
}

function writePackage(root: string, name: string, version: string, extra: Record<string, unknown> = {}) {
  const dir = join(root, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version, main: 'index.js', ...extra }))
  writeFileSync(join(dir, 'index.js'), '')
  return dir
}

/** A `@poveste/vendors` whose manifest declares the aliases given. */
function writeVendors(root: string, dependencies: Record<string, string>) {
  const dir = join(root, 'node_modules', '@poveste', 'vendors')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: '@poveste/vendors',
    version: '0.0.0',
    dependencies,
    exports: { './vue': './vue.js' },
  }))
  writeFileSync(join(dir, 'vue.js'), '')
}

describe('the aliases @poveste/vendors declares', () => {
  it('reads the bare package out of each npm alias', () => {
    expect(vendoredAliases({
      'poveste-vue': 'npm:vue@^3.5.26',
      'poveste-vue-router': 'npm:vue-router@^5.3.1',
    })).toEqual({
      'poveste-vue': { name: 'vue', range: '^3.5.26' },
      'poveste-vue-router': { name: 'vue-router', range: '^5.3.1' },
    })
  })

  it('keeps the scope on a scoped package', () => {
    expect(vendoredAliases({
      'poveste-iconify-vue': 'npm:@iconify/vue@^5.0.1',
      'poveste-vueuse-core': 'npm:@vueuse/core@^15.0.0',
    })).toEqual({
      'poveste-iconify-vue': { name: '@iconify/vue', range: '^5.0.1' },
      'poveste-vueuse-core': { name: '@vueuse/core', range: '^15.0.0' },
    })
  })

  it('ignores a dependency that is not an alias', () => {
    expect(vendoredAliases({ pathe: '^2.0.3' })).toEqual({})
    expect(vendoredAliases(undefined)).toEqual({})
  })

  // The separator is the last `@`, not the first: a scoped package opens with one.
  it('takes an alias written without a range', () => {
    expect(vendoredAliases({
      'poveste-vue': 'npm:vue',
      'poveste-iconify-vue': 'npm:@iconify/vue',
    })).toEqual({
      'poveste-vue': { name: 'vue', range: '' },
      'poveste-iconify-vue': { name: '@iconify/vue', range: '' },
    })
  })
})

describe('the caret range check', () => {
  it('takes a version at or above the floor in the same minor', () => {
    expect(satisfiesCaret('3.5.26', '^3.5.26')).toBe(true)
    expect(satisfiesCaret('3.5.43', '^3.5.26')).toBe(true)
  })

  it('takes a higher minor whatever its patch', () => {
    expect(satisfiesCaret('3.6.0', '^3.5.26')).toBe(true)
  })

  // The `--legacy-peer-deps` reader of #1062: a Vue the peer range would have refused.
  it('refuses a version below the floor', () => {
    expect(satisfiesCaret('3.5.25', '^3.5.26')).toBe(false)
    expect(satisfiesCaret('3.4.99', '^3.5.26')).toBe(false)
    expect(satisfiesCaret('3.2.0', '^3.5.26')).toBe(false)
  })

  it('refuses another major in either direction', () => {
    expect(satisfiesCaret('4.0.0', '^3.5.26')).toBe(false)
    expect(satisfiesCaret('2.7.16', '^3.5.26')).toBe(false)
  })

  /*
   * Refused rather than approximated, which is the whole design. `poveste` has no
   * `semver` dependency and a hand-rolled `satisfies` that quietly mis-handles a form
   * it was never given is worse than declining to answer.
   */
  it('refuses every form it cannot read with certainty', () => {
    expect(satisfiesCaret('3.6.0-beta.1', '^3.5.26')).toBe(false)
    expect(satisfiesCaret('3.5.43', '>=3.5.26 <4')).toBe(false)
    expect(satisfiesCaret('3.5.43', '~3.5.26')).toBe(false)
    expect(satisfiesCaret('3.5.43', '3.5.26')).toBe(false)
    expect(satisfiesCaret('3.5.43', '*')).toBe(false)
    expect(satisfiesCaret('3.5.43', '')).toBe(false)
    expect(satisfiesCaret('3.5.43', undefined)).toBe(false)
    expect(satisfiesCaret(undefined, '^3.5.26')).toBe(false)
  })

  // `^0.x` narrows to the minor, and no vendored range uses it.
  it('refuses a zero-major caret rather than guessing its rule', () => {
    expect(satisfiesCaret('0.5.1', '^0.5.0')).toBe(false)
  })
})

/*
 * Every other case here builds a synthetic manifest, so nothing else would notice
 * the real one drifting to a form `satisfiesCaret` declines to read. It refuses what
 * it cannot read with certainty, which is the right direction to fail in and an
 * invisible one: a range edited to `~3.5.26`, `>=3.5.26` or a pinned `3.5.26` would
 * stop the collapse silently and bring #1060 back for every npm consumer with the
 * whole suite green. This is the assertion that goes red instead.
 */
describe('the range @poveste/vendors really declares', () => {
  it('is a form the guard reads, and the vendored copy satisfies it', () => {
    // Resolved the way `collapseVendoredVue` resolves it — through an exported
    // subpath, since vendors' `exports` map does not list `./package.json`.
    const entry = nodeResolver('@poveste/vendors/vue', import.meta.dirname)
    expect(entry, '@poveste/vendors is not resolvable from packages/poveste').toBeDefined()

    const manifest = JSON.parse(readFileSync(join(entry!, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const vue = Object.entries(vendoredAliases(manifest.dependencies)).find(([, alias]) => alias.name === 'vue')
    expect(vue, '@poveste/vendors declares no npm alias of vue').toBeDefined()

    const [installedAs, { range }] = vue!
    const version = JSON.parse(readFileSync(nodeResolver(`${installedAs}/package.json`, join(entry!, '..'))!, 'utf8')) as {
      version: string
    }

    expect(
      satisfiesCaret(version.version, range),
      `@poveste/vendors declares ${installedAs} as ${range}, which collapseVendoredVue cannot read — `
      + 'the chrome would silently keep its own Vue and #1060 returns for npm consumers',
    ).toBe(true)
  })
})

describe('collapsing the chrome Vue onto the project Vue', () => {
  /*
   * The defect. An npm alias is a distinct package name, so `poveste-vue` is a
   * second physical copy of Vue whatever the project already has, and
   * `resolve.dedupe: ['vue']` cannot see it because dedupe matches on the name. Two
   * copies is two reactivity systems, and `RouterView` — defined with one, rendered
   * by the other — never re-rendered after its first empty pass (#1060).
   */
  it('points the vendored name at the project copy when they are two copies', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    // The bare name, not a resolved path: a path is whatever the `require` condition
    // answers, which for Vue is a CJS shim that leaves the browser app unable to boot.
    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({ 'poveste-vue': 'vue' })
  })

  /*
   * pnpm's layout (#1201): the project's `node_modules` holds `vue` but not
   * `@poveste/vendors`, which sits beside `poveste` in the store with its own
   * `poveste-vue`. Resolved from the project root, vendors was not found at all.
   */
  it('finds vendors from Poveste\'s own install when the project root has none', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    const store = join(root, 'node_modules', '.pnpm', 'poveste@0.0.0')
    writePackage(store, 'poveste-vue', '3.5.43')
    writeVendors(store, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root, vendorsFrom: join(store, 'node_modules', 'poveste') })).toEqual({ 'poveste-vue': 'vue' })
  })

  it('resolves vendors from Poveste\'s own install by default, not from the project', () => {
    const vendored = JSON.parse(readFileSync(nodeResolver('poveste-vue/package.json', join(nodeResolver('@poveste/vendors/vue', import.meta.dirname)!, '..'))!, 'utf8')) as { version: string }
    const root = tempRoot()
    writePackage(root, 'vue', vendored.version)

    expect(collapseVendoredVue({ root })).toEqual({ 'poveste-vue': 'vue' })
  })

  /*
   * pnpm's layout: the alias and the project's Vue are one file in the store. Still
   * the bare name, because Vite keys a pre-bundled dependency by the name it is
   * imported under, and `poveste-vue` was served raw beside the pre-bundled `vue`:
   * one file, two module instances (#1201).
   */
  it('points the vendored name at the project\'s even when they are one file', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    symlinkSync(join(root, 'node_modules', 'vue'), join(root, 'node_modules', 'poveste-vue'))
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({ 'poveste-vue': 'vue' })
  })

  it('leaves the vendored copy alone when the majors differ', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '4.0.1')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({})
  })

  /*
   * The project's Vue is checked against the range vendors pins, not assumed from the
   * peer floor. `--legacy-peer-deps` is how a project ends up holding a Vue the peer
   * range would have refused (#1062), and collapsing the chrome onto it would hand a
   * reader a chrome its Vue cannot run.
   */
  it('leaves the vendored copy alone below the range vendors pins', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.2.0')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({})
  })

  it('leaves the vendored copy alone when the pinned range is not a plain caret', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@>=3.5.26 <4' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({})
  })

  // The failure of aliasing is a chrome that keeps a Vue it can certainly run; the
  // failure of guessing is a chrome handed one it cannot.
  it('leaves the vendored copy alone when the project version cannot be read', () => {
    const root = tempRoot()
    const dir = writePackage(root, 'vue', '3.5.43')
    writeFileSync(join(dir, 'package.json'), '{ not json')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({})
  })

  /*
   * Through the injected resolver rather than a bare temp tree, and measured rather
   * than assumed: vitest exports a `NODE_PATH` holding pnpm's hoisted
   * `node_modules/.pnpm/node_modules`, which Node consults after the directory walk,
   * so a real `resolve('vue', <temp root>)` finds the workspace's Vue and no fixture
   * on disk can express "nothing answers". Production resolution honours `NODE_PATH`
   * too, so the resolver is right and the assertion is what had to move.
   */
  it('has nothing to do for a project with no Vue of its own', () => {
    const root = tempRoot()
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    const resolve = (specifier: string, from: string) =>
      specifier === 'vue' ? undefined : nodeResolver(specifier, from)

    expect(collapseVendoredVue({ root, resolve, vendorsFrom: root })).toEqual({})
  })

  it('has nothing to do when vendors declares no Vue alias', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-pinia': 'npm:pinia@^4.0.3' })

    expect(collapseVendoredVue({ root, vendorsFrom: root })).toEqual({})
  })
})
