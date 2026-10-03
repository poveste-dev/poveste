import type { Plugin as VitePlugin } from 'vite'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'

/**
 * Resolves `specifier` as Node would from `from`, to a real path, or `undefined`
 * when nothing answers.
 */
export type Resolver = (specifier: string, from: string) => string | undefined

// A file of this package's own, to resolve from.
const POVESTE_FILE = fileURLToPath(import.meta.url)

function packageName(specifier: string) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!
}

/**
 * Finds the package by walking `node_modules` up from `from`, then lets Node resolve
 * the subpath from inside it, through its `exports`. Not `require.resolve` from `from`:
 * Node folds NODE_PATH into every lookup, even with `paths`, and pnpm's bin shims
 * point it at the whole store, so a Svelte book run through `poveste` "had" a Vue of
 * its own and the chrome was collapsed onto a Vue Vite could not find (#1201).
 */
export const nodeResolver: Resolver = (specifier, from) => {
  const name = packageName(specifier)
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      try {
        // From a file inside the package, whose own `node_modules` parent is the
        // first place Node looks, so the lookup ends here before NODE_PATH.
        return realpathSync(createRequire(join(candidate, 'package.json')).resolve(specifier))
      }
      catch {
        return undefined
      }
    }
    if (dirname(dir) === dir) {
      return undefined
    }
  }
}

export interface VendoredAlias {
  /** The bare package the alias points at, `vue`. */
  name: string
  /** The range it is pinned to, `^3.5.26`, or `''` when the spec carries none. */
  range: string
}

/**
 * What each vendored dependency aliases, by the name it is installed under:
 * `{ 'poveste-vue': { name: 'vue', range: '^3.5.26' } }` from
 * `"poveste-vue": "npm:vue@^3.5.26"`.
 *
 * Derived from the manifest rather than listed, because the set is whatever
 * `@poveste/vendors` declares and a list here would keep working while silently
 * covering one name fewer. The range comes back with the name because the caller
 * needs both and this is the only place the spec is parsed.
 */
export function vendoredAliases(dependencies: Record<string, string> | undefined): Record<string, VendoredAlias> {
  const aliases: Record<string, VendoredAlias> = {}

  for (const [installedAs, spec] of Object.entries(dependencies ?? {})) {
    if (!spec.startsWith('npm:')) {
      continue
    }

    // Split on the last `@` rather than matching a name pattern: a scoped package
    // opens with one, so the separator is positional and a regex that allows both
    // is the kind the linter rejects for backtracking.
    const target = spec.slice('npm:'.length)
    const at = target.lastIndexOf('@')
    aliases[installedAs] = at > 0
      ? { name: target.slice(0, at), range: target.slice(at + 1) }
      : { name: target, range: '' }
  }

  return aliases
}

/**
 * Whether `version` satisfies a caret range, for the caret ranges `@poveste/vendors`
 * actually declares and **nothing else**.
 *
 * A range this cannot read with certainty is refused rather than approximated. That
 * is the point: `poveste` has no `semver` dependency, a patch release is the wrong
 * place to add one, and a hand-rolled `satisfies` that silently mis-handles a form it
 * was never given is the failure this repo keeps producing. So `^X.Y.Z` with a major
 * of at least 1 is answered, and `^0.x`, a comparator set or anything else returns
 * false and leaves the chrome on the copy it can certainly run.
 *
 * A prerelease is answered too, though npm's own caret leaves one out. Refusing it
 * left the chrome on the vendored Vue while pinia's bare `vue` took the project's
 * prerelease, which is #1060's split, and the book rendered no story (#1163). So a
 * prerelease counts when its `X.Y.Z` is above the floor in the same major. One of the
 * floor itself sorts below the floor, and is refused.
 */
export function satisfiesCaret(version: string | undefined, range: string | undefined): boolean {
  const wanted = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range ?? '')
  const have = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Z.-]+)?$/i.exec(version ?? '')

  if (!wanted || !have) {
    return false
  }

  const [wantedMajor, wantedMinor, wantedPatch] = wanted.slice(1).map(Number)
  const [major, minor, patch] = have.slice(1, 4).map(Number)
  const prerelease = have[4] !== undefined

  // `^0.x` narrows to the minor, and no vendored range uses it. Refuse rather than
  // implement a rule nothing here exercises.
  if (wantedMajor === 0 || wantedMajor === undefined || major === undefined) {
    return false
  }

  if (major !== wantedMajor) {
    return false
  }

  if (minor! !== wantedMinor!) {
    return minor! > wantedMinor!
  }

  return prerelease ? patch! > wantedPatch! : patch! >= wantedPatch!
}

/**
 * Points the chrome's Vue at the project's, when they are two copies.
 *
 * `@poveste/vendors` depends on `poveste-vue`, an npm alias of `vue`. An alias is
 * a **distinct package name**, so a package manager installs a second physical copy
 * whatever the project already has — the project's Vue satisfying the aliased range
 * does not collapse them, and `resolve.dedupe` cannot, because it matches on name.
 *
 * Two copies is two reactivity systems. The chrome's components render with the
 * vendored one while `RouterView` — reached through `poveste-vue-router`, whose own
 * `vue` import is bare — reacts with the project's, so `RouterView`'s first render
 * is never invalidated and a Vue consumer's `poveste dev` showed a sidebar, a
 * breadcrumb and no story at all. Nothing warns: neither copy is wrong, they simply
 * cannot see each other (#1060).
 *
 * Only Vue. The reactivity identity is what breaks, and `@poveste/plugin-vue`
 * declaring `vue` as a peer is what licenses pointing the chrome at the project's
 * copy — no peer range licenses the same for pinia, vue-router, VueUse or Iconify,
 * and making the chrome's pinned copies authoritative for a project's own story code
 * is a larger change than this defect asks for.
 *
 * Empty when the project has no Vue of its own, or when the project's Vue does not
 * satisfy the range vendors pins — in each
 * case the vendored copy is what the chrome should keep. Refusing on anything it
 * cannot read with certainty is deliberate: the failure of this function is a chrome
 * that keeps a Vue it can certainly run, and the failure of guessing is a chrome
 * handed one it cannot.
 *
 * The range is checked rather than assumed from the peer floor. A project only holds
 * a Vue of its own because a framework plugin's peer range put it there — except that
 * `--legacy-peer-deps` is exactly how a project ends up holding one the peer range
 * would have refused (#1062), which leaves a reader on, say, Vue 3.2 with a chrome
 * collapsed onto a Vue that cannot run it. Such a project is already broken without
 * this fix, but "already broken" is not a reason to hand it a different break.
 */
export function collapseVendoredVue(options: {
  root: string
  resolve?: Resolver
  /** Where `@poveste/vendors` is resolved from: Poveste's own install unless a test says otherwise. */
  vendorsFrom?: string
}): Record<string, string> {
  const { root } = options
  const resolve = options.resolve ?? nodeResolver

  // Vendors from Poveste's own install, and `poveste-vue` from the vendors directory:
  // that is where each import happens. An isolated `node_modules` layout, pnpm's,
  // puts neither at the project root, so resolving vendors from there found nothing,
  // nothing was collapsed, and a pnpm book had two Vues (#1201).
  // Through an exported subpath: vendors' `exports` map does not list
  // `./package.json`, so resolving that name directly fails.
  const vendorsEntry = resolve('@poveste/vendors/vue', options.vendorsFrom ?? dirname(POVESTE_FILE))
  const vendorsDir = vendorsEntry ? join(vendorsEntry, '..') : undefined
  if (!vendorsDir) {
    return {}
  }

  const vueAlias = Object.entries(vendoredAliases(readJson<{ dependencies?: Record<string, string> }>(join(vendorsDir, 'package.json'))?.dependencies))
    .find(([, alias]) => alias.name === 'vue')

  if (!vueAlias) {
    return {}
  }

  const [installedAs, { range }] = vueAlias

  const vendored = resolve(installedAs, vendorsDir)
  const project = resolve('vue', root)

  // Even when they are one file, as pnpm makes them: Vite keys a pre-bundled dependency
  // by the name it is imported under, so `poveste-vue` was served raw beside the
  // pre-bundled `vue` — one file, two module instances, and no story (#1201).
  if (!vendored || !project) {
    return {}
  }

  if (!satisfiesCaret(versionOf('vue/package.json', resolve, root), range)) {
    return {}
  }

  // To the bare name, not to `project`. A resolved path is whatever the `require`
  // condition answers — for Vue that is a CJS shim, and handing the chrome that
  // replaced a split reactivity system with a browser app that does not boot at all.
  // The name lets Vite resolve its own entry and condition, and `resolve.dedupe`
  // above then genuinely covers the result.
  return { [installedAs]: 'vue' }
}

function versionOf(specifier: string, resolve: Resolver, root: string): string | undefined {
  const manifest = resolve(specifier, root)
  if (!manifest) {
    return undefined
  }
  return readJson<{ version?: string }>(manifest)?.version
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  }
  catch {
    return undefined
  }
}

/**
 * Resolves `@poveste/vendors` from Poveste's own install, wherever it is imported.
 *
 * `@poveste/vendors` is excluded from pre-bundling, so the pre-bundled
 * `@poveste/controls` keeps bare imports of it. Vite resolves an optimized entry's
 * imports from the package's real location, but a shared chunk of one has no real
 * location and resolves from `node_modules/.pvt-vite/deps` under the project. Since
 * #593 split the controls into chunks, that only worked where npm or Yarn had
 * hoisted `@poveste/vendors` to the project's `node_modules`. pnpm doesn't, and
 * `poveste dev` rendered a blank page (#1201).
 */
export function vendorsFromPoveste(): VitePlugin {
  return {
    name: 'poveste:vendors-from-poveste',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (source !== '@poveste/vendors' && !source.startsWith('@poveste/vendors/')) {
        return null
      }
      return this.resolve(source, POVESTE_FILE, { ...options, skipSelf: true })
    },
  }
}

/**
 * The chrome's vendored packages, as nested pre-bundle specifiers, for a book with no
 * Vue of its own (Svelte, Solid, React).
 *
 * There the collapse has no project Vue to point at, and under pnpm `poveste-vue`
 * and the `vue` that `poveste-vue-router` imports are one file in the store. Vite
 * pre-bundled the first and served the second raw: one file, two module instances,
 * and a book that rendered no story. Pre-bundling every vendored package together,
 * reached through Poveste's own install, puts their Vue in one shared chunk (#1201).
 *
 * Empty wherever the collapse applies, or when the chain cannot be resolved from
 * the project, where Vite would only warn about an include it cannot find.
 */
export function chromePrebundles(options: {
  root: string
  resolve?: Resolver
  vendorsFrom?: string
}): string[] {
  const { root } = options
  const resolve = options.resolve ?? nodeResolver

  if (resolve('vue', root) || !resolve('poveste/package.json', root)) {
    return []
  }
  const vendorsEntry = resolve('@poveste/vendors/vue', options.vendorsFrom ?? dirname(POVESTE_FILE))
  if (!vendorsEntry) {
    return []
  }
  const aliases = vendoredAliases(readJson<{ dependencies?: Record<string, string> }>(join(vendorsEntry, '..', 'package.json'))?.dependencies)
  return Object.keys(aliases).map(installedAs => `poveste > @poveste/vendors > ${installedAs}`)
}
