import { readFile } from 'node:fs/promises'
import { transformStoryAutoProps } from './auto-props.js'
import { extractPropDefs } from './props.js'

// Cheaper than a parse, and unlike a filename pattern it cannot go blind when a
// project narrows `storyMatch`.
const RENDERS_A_STORY = '<Hst.Story'
const IMPORTS_A_COMPONENT = /from\s*['"][^'"]*\.svelte['"]/

/** Runs before `vite-plugin-svelte`: after it compiles there is nothing left to rewrite (#233). */
export function svelteAutoProps() {
  return {
    name: 'poveste:svelte-auto-props',
    enforce: 'pre' as const,

    async transform(this: any, code: string, id: string) {
      if (!id.split('?')[0].endsWith('.svelte') || !code.includes(RENDERS_A_STORY) || !IMPORTS_A_COMPONENT.test(code)) {
        return undefined
      }

      const result = await transformStoryAutoProps(code, async (specifier) => {
        const resolved = await this.resolve(specifier, id)
        if (!resolved) {
          return undefined
        }
        const file = resolved.id.split('?')[0]
        // Baked into this module, so Vite has to know it depends on the source.
        this.addWatchFile(file)
        try {
          return extractPropDefs(await readFile(file, 'utf8'))
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
