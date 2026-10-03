import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'

/**
 * Resolves `specifier` as Node would from `from`, to a real path, or `undefined`
 * when nothing answers.
 */
export type Resolver = (specifier: string, from: string) => string | undefined

export const nodeResolver: Resolver = (specifier, from) => {
  try {
    // `createRequire` resolves relative to the *dirname* of what it is given, so a
    // directory has to be named as a file inside it or every lookup starts one
    // level too high.
    return realpathSync(createRequire(join(from, 'noop.js')).resolve(specifier))
  }
  catch {
    return undefined
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
 * Empty when the project has no Vue of its own, when the two already resolve to one
 * file, or when the project's Vue does not satisfy the range vendors pins — in each
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
}): Record<string, string> {
  const { root } = options
  const resolve = options.resolve ?? nodeResolver

  // From the vendors directory, not from the project: that is where the import
  // happens, and an isolated `node_modules` layout makes `poveste-vue` invisible
  // from the project root while the chrome resolves it perfectly well.
  // Through an exported subpath: vendors' `exports` map does not list
  // `./package.json`, so resolving that name directly fails.
  const vendorsEntry = resolve('@poveste/vendors/vue', root)
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

  if (!vendored || !project || vendored === project) {
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
