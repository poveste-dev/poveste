import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'
import { collapseVendoredVue, nodeResolver, vendoredAliases } from '../vendors.js'

// macOS reports `/var` and hands back `/private/var`, which resolution accepts and a
// path comparison does not.
function tempRoot() {
  return realpathSync(mkdtempSync(join(tmpdir(), 'poveste-vendors-')))
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
      'poveste-vue': 'vue',
      'poveste-vue-router': 'vue-router',
    })
  })

  it('keeps the scope on a scoped package', () => {
    expect(vendoredAliases({
      'poveste-iconify-vue': 'npm:@iconify/vue@^5.0.1',
      'poveste-vueuse-core': 'npm:@vueuse/core@^15.0.0',
    })).toEqual({
      'poveste-iconify-vue': '@iconify/vue',
      'poveste-vueuse-core': '@vueuse/core',
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
      'poveste-vue': 'vue',
      'poveste-iconify-vue': '@iconify/vue',
    })
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
    expect(collapseVendoredVue({ root })).toEqual({ 'poveste-vue': 'vue' })
  })

  it('has nothing to do when both names already resolve to one file', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    symlinkSync(join(root, 'node_modules', 'vue'), join(root, 'node_modules', 'poveste-vue'))
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root })).toEqual({})
  })

  it('leaves the vendored copy alone when the majors differ', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '4.0.1')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root })).toEqual({})
  })

  // The failure of aliasing is a chrome that keeps a Vue it can certainly run; the
  // failure of guessing is a chrome handed one it cannot.
  it('leaves the vendored copy alone when a version cannot be read', () => {
    const root = tempRoot()
    const dir = writePackage(root, 'vue', '3.5.43')
    writeFileSync(join(dir, 'package.json'), '{ not json')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-vue': 'npm:vue@^3.5.26' })

    expect(collapseVendoredVue({ root })).toEqual({})
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

    expect(collapseVendoredVue({ root, resolve })).toEqual({})
  })

  it('has nothing to do when vendors declares no Vue alias', () => {
    const root = tempRoot()
    writePackage(root, 'vue', '3.5.43')
    writePackage(root, 'poveste-vue', '3.5.43')
    writeVendors(root, { 'poveste-pinia': 'npm:pinia@^4.0.3' })

    expect(collapseVendoredVue({ root })).toEqual({})
  })
})
