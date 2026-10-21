import type { PropDefinition } from '@poveste/shared'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { transformStoryAutoProps } from './auto-props.js'
import { extractPropDefs } from './props.js'
import { isSvelteStory } from './story-source.js'

const IMPORTS_A_COMPONENT = /from\s*['"][^'"]*\.svelte['"]/

/** Runs before `vite-plugin-svelte`: after it compiles there is nothing left to rewrite (#233). */
export function svelteAutoProps() {
  // Shared by every story and by both passes a build makes: each story re-resolved
  // and re-parsed the components it imports, 30 times for 12 files in the Svelte
  // example (#476). A resolution holds until a file is created or deleted; props
  // hold while the component's source is unchanged.
  const resolutions = new Map<string, Promise<string | undefined>>()
  const parsed = new Map<string, { source: string, props: PropDefinition[] | undefined }>()

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

      const result = await transformStoryAutoProps(code, async (specifier) => {
        const key = `${dirname(id)}\0${specifier}`
        if (!resolutions.has(key)) {
          resolutions.set(key, this.resolve(specifier, id).then(
            (resolved: { id: string } | null) => resolved?.id.split('?')[0],
            (error: unknown) => {
              resolutions.delete(key)
              throw error
            },
          ))
        }
        const file = await resolutions.get(key)
        if (!file) {
          return undefined
        }
        // Baked into this module, so Vite has to know it depends on the source.
        this.addWatchFile(file)
        try {
          const source = await readFile(file, 'utf8')
          const cached = parsed.get(file)
          if (cached?.source === source) {
            return cached.props
          }
          const props = extractPropDefs(source)
          parsed.set(file, { source, props })
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
