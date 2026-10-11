export const ignorePlugins = [
  'nuxt:vite-node-server',
  'nuxt:dev-style-ssr',
  'nuxt:vite-relative-asset',
  'nuxt:cache-dir',
  'nuxt:dynamic-base-path',
  'nuxt:import-protection',
  // Looks for Nuxt's client entry to inject a preload polyfill into. A book has
  // none, so it raised `NUXT_B7005` and said it could not resolve the entry, at
  // every start and build, with a fix hint that does not apply here (#1203).
  'nuxt:module-preload-polyfill',
]

export function withoutIgnoredPlugins<T>(plugins: T): T {
  if (!Array.isArray(plugins)) {
    return plugins
  }
  return plugins
    .filter(plugin => !ignorePlugins.includes(plugin?.name))
    .map(plugin => withoutIgnoredPlugins(plugin)) as T
}
