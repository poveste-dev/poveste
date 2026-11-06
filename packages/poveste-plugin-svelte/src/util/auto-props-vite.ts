import type { PropDefinition } from '@poveste/shared'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { transformStoryAutoProps } from './auto-props.js'
import { extractPropDefs, typeImports } from './props.js'
import { isSvelteStory } from './story-source.js'

const IMPORTS_A_COMPONENT = /from\s*['"][^'"]*\.svelte['"]/

/** Runs before `vite-plugin-svelte`: after it compiles there is nothing left to rewrite (#233). */
export function svelteAutoProps() {
  // Shared by every story and by both passes a build makes: each story re-resolved
  // and re-parsed the components it imports, 30 times for 12 files in the Svelte
  // example (#476). A resolution holds until a file is created or deleted; props
  // hold while the component's source is unchanged.
  const resolutions = new Map<string, Promise<string | undefined>>()
  // Keyed on every file read, the props type's own file too, since editing either changes the props.
  const parsed = new Map<string, { sources: string, props: PropDefinition[] | undefined }>()

  return {
    name: 'poveste:svelte-auto-props',
    enforce: 'pre' as const,

    watchChange(_id: string, change: { event: 'create' | 'update' | 'delete' }) {
      if (change.event !== 'update') {
        resolutions.clear()
      }
    },

    async transform(this: any, code: string, id: string) {
      if (!isSvelteStory(id, code) || !IMPORTS_A_COMPONENT.test(code)) {
        return undefined
      }

      const resolveFrom = (specifier: string, importer: string) => {
        const key = `${dirname(importer)}\0${specifier}`
        if (!resolutions.has(key)) {
          resolutions.set(key, this.resolve(specifier, importer).then(
            (resolved: { id: string } | null) => resolved?.id.split('?')[0],
            (error: unknown) => {
              resolutions.delete(key)
              throw error
            },
          ))
        }
        return resolutions.get(key)!
      }

      const result = await transformStoryAutoProps(code, async (specifier) => {
        const file = await resolveFrom(specifier, id)
        if (!file) {
          return undefined
        }
        // Baked into this module, so Vite has to know it depends on the source.
        this.addWatchFile(file)
        try {
          const source = await readFile(file, 'utf8')
          const imported: Record<string, string> = {}
          for (const typeSpecifier of typeImports(source)) {
            const typeFile = await resolveFrom(typeSpecifier, file)
            const typeSource = typeFile && await readFile(typeFile, 'utf8').catch(() => undefined)
            if (typeFile && typeSource !== undefined) {
              this.addWatchFile(typeFile)
              imported[typeSpecifier] = typeSource
            }
          }
          const sources = JSON.stringify([source, imported])
          const cached = parsed.get(file)
          if (cached?.sources === sources) {
            return cached.props
          }
          const props = extractPropDefs(source, imported)
          parsed.set(file, { sources, props })
          return props
        }
        catch (error: any) {
          // Not a failed build, but silence would look like a component that
          // declares nothing.
          this.warn(`[poveste] could not read props from ${file}: ${error.message}`)
          return undefined
        }
      })

      return result === undefined ? undefined : { code: result, map: null }
    },
  }
}
