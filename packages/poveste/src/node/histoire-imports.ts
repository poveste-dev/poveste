import type { Plugin, Rolldown } from 'vite'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'

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

/**
 * The same renaming for Vite's dependency scan, which pre-bundles a bare import under the
 * name it is written with: `@histoire/plugin-vue` was pre-bundled as such, the page asked
 * for `@poveste/plugin-vue`, and the first story load bundled it again and reloaded (#1746).
 */
export function histoireScanImports(): Rolldown.Plugin {
  return {
    name: 'poveste:histoire-scan-imports',

    async resolveId(id, importer, options) {
      const renamed = povesteSpecifier(id)
      if (!renamed) {
        return undefined
      }
      return await this.resolve(renamed, scanImporter(renamed, importer), { ...options, skipSelf: true })
    },
  }
}

// One bare import the scan cannot resolve drops its whole result, so unlike `histoireImports()`
// it cannot try the book and then poveste: under strict pnpm a book reaches its plugins but not
// `@poveste/shared`. A script block's importer is `virtual-module:<file>?id=<n>`.
function scanImporter(renamed: string, importer: string | undefined): string {
  if (!importer) {
    return FROM_POVESTE
  }
  const name = renamed.split('/').slice(0, renamed.startsWith('@') ? 2 : 1).join('/')
  let dir: string | undefined = dirname(importer.replace(/^virtual-module:/, '').replace(/\?.*$/, ''))
  while (dir) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) {
      return importer
    }
    const parent = dirname(dir)
    dir = parent === dir ? undefined : parent
  }
  return FROM_POVESTE
}
