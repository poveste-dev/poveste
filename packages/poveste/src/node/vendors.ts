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

/**
 * The bare package a vendored dependency aliases, by the name it is installed
 * under: `{ 'poveste-vue': 'vue' }` from `"poveste-vue": "npm:vue@^3.5.26"`.
 *
 * Derived from the manifest rather than listed, because the set is whatever
 * `@poveste/vendors` declares and a list here would keep working while silently
 * covering one name fewer.
 */
export function vendoredAliases(dependencies: Record<string, string> | undefined): Record<string, string> {
  const aliases: Record<string, string> = {}

  for (const [installedAs, spec] of Object.entries(dependencies ?? {})) {
    if (!spec.startsWith('npm:')) {
      continue
    }

    // Split on the last `@` rather than matching a name pattern: a scoped package
    // opens with one, so the separator is positional and a regex that allows both
    // is the kind the linter rejects for backtracking.
    const target = spec.slice('npm:'.length)
    const range = target.lastIndexOf('@')
    aliases[installedAs] = range > 0 ? target.slice(0, range) : target
  }

  return aliases
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
 * file, or when their majors differ or cannot be read — in each case the vendored copy
 * is what the chrome should keep. Refusing on an unreadable version is deliberate: the
 * failure of this function is a chrome that keeps a Vue it can certainly run, and the
 * failure of guessing is a chrome handed one it cannot.
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

  const installedAs = Object.entries(vendoredAliases(readJson<{ dependencies?: Record<string, string> }>(join(vendorsDir, 'package.json'))?.dependencies))
    .find(([, bare]) => bare === 'vue')?.[0]

  if (!installedAs) {
    return {}
  }

  const vendored = resolve(installedAs, vendorsDir)
  const project = resolve('vue', root)

  if (!vendored || !project || vendored === project) {
    return {}
  }

  const vendoredMajor = majorOf(versionOf(`${installedAs}/package.json`, resolve, vendorsDir))
  const projectMajor = majorOf(versionOf('vue/package.json', resolve, root))

  if (vendoredMajor === undefined || vendoredMajor !== projectMajor) {
    return {}
  }

  // To the bare name, not to `project`. A resolved path is whatever the `require`
  // condition answers — for Vue that is a CJS shim, and handing the chrome that
  // replaced a split reactivity system with a browser app that does not boot at all.
  // The name lets Vite resolve its own entry and condition, and `resolve.dedupe`
  // above then genuinely covers the result.
  return { [installedAs]: 'vue' }
}

// Enough of a version check to refuse the one case that cannot work, and no more.
// The floor is already enforced where it belongs: a project reaches this only by
// having a Vue of its own, which a framework plugin's peer range put there.
function majorOf(version: string | undefined): string | undefined {
  return /^(\d+)\./.exec(version ?? '')?.[1]
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
