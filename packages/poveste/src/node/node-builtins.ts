import type { Plugin as VitePlugin } from 'vite'
import { isBuiltin } from 'node:module'
import { relative } from 'pathe'

export type BuiltinImports = Map<string, Set<string>>

export function nodeBuiltinsPlugin(found: BuiltinImports): VitePlugin {
  return {
    name: 'poveste:node-builtins',
    enforce: 'pre',
    // Here and not from the module graph, where every built-in is one module with
    // no name of its own. Asking the resolver leaves out one a polyfill replaced.
    async resolveId(source, importer, options) {
      if (!importer || !isBuiltin(source)) {
        return null
      }
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (resolved?.id.startsWith('__vite-browser-external')) {
        found.set(source, (found.get(source) ?? new Set()).add(importer))
      }
      return resolved
    },
  }
}

/**
 * A warning, not a failure: a built-in that is imported and never called costs
 * nothing in the browser, so failing would refuse a book that works. Printed here
 * as well as by Vite because Vite's line sits hundreds of lines above the result,
 * doesn't say a call will fail, and is gone at `logLevel: 'error'` (#1491).
 */
export function nodeBuiltinsWarning(found: BuiltinImports, root: string): string[] {
  if (!found.size) {
    return []
  }
  const name = (importer: string) => relative(root, importer.replace(/^\0/, '').split('?')[0]!)
  return [
    `⚠️  ${found.size} Node built-in${found.size === 1 ? '' : 's'} reached the browser bundle as an empty module, so calling one there fails:`,
    ...[...found].map(([builtin, importers]) => `   ${builtin}, imported by ${[...new Set([...importers].map(name))].join(', ')}`),
  ]
}
