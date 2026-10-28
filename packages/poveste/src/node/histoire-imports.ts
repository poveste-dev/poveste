import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

/**
 * Every package histoire 0.17 publishes that poveste ships under its own name,
 * each exporting at least the names histoire's does, checked against the 0.17.17
 * tarballs. Not here: `@histoire/plugin-vue2`, which has no poveste equivalent,
 * and `@histoire/vendors`' `floating-vue` and `scroll` entries, which poveste
 * dropped; an import of either still fails, and the migration guide names them.
 */
const RENAMED: Record<string, string> = {
  'histoire': 'poveste',
  '@histoire/app': '@poveste/app',
  '@histoire/controls': '@poveste/controls',
  '@histoire/plugin-nuxt': '@poveste/plugin-nuxt',
  '@histoire/plugin-percy': '@poveste/plugin-percy',
  '@histoire/plugin-screenshot': '@poveste/plugin-screenshot',
  '@histoire/plugin-svelte': '@poveste/plugin-svelte',
  '@histoire/plugin-vue': '@poveste/plugin-vue',
  '@histoire/shared': '@poveste/shared',
  '@histoire/vendors': '@poveste/vendors',
}

/** The poveste specifier for a histoire one, entry path kept, or nothing for any other import. */
export function povesteSpecifier(id: string): string | undefined {
  for (const [from, to] of Object.entries(RENAMED)) {
    if (id === from || id.startsWith(`${from}/`)) {
      return to + id.slice(from.length)
    }
  }
  return undefined
}

// Under pnpm a book has `poveste` and its plugins, not their dependencies, so
// `@poveste/shared` resolves from here when it doesn't from the book.
const FROM_POVESTE = fileURLToPath(import.meta.url)

/**
 * A histoire book's story and setup files import from `histoire/client` and
 * `@histoire/plugin-vue`, and after the dependency swap neither is installed:
 * the setup file failed to load and no story was collected (#1530). Each resolves
 * to poveste's package instead, a compatibility shim that doesn't expire.
 */
export function histoireImports(): Plugin {
  return {
    name: 'poveste:histoire-imports',
    enforce: 'pre',

    async resolveId(id, importer, options) {
      const renamed = povesteSpecifier(id)
      if (!renamed) {
        return undefined
      }
      return await this.resolve(renamed, importer, { ...options, skipSelf: true })
        ?? await this.resolve(renamed, FROM_POVESTE, { ...options, skipSelf: true })
    },
  }
}
