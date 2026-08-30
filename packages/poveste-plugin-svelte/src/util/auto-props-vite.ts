import { readFile } from 'node:fs/promises'
import { transformStoryAutoProps } from './auto-props.js'
import { extractPropDefs } from './props.js'

// What a story must contain for the transform to have anything to do. Cheaper
// than a parse, and — unlike a filename pattern — it does not go silently blind
// when a project narrows `storyMatch` to its own glob.
const RENDERS_A_STORY = '<Hst.Story'
const IMPORTS_A_COMPONENT = /from\s*['"][^'"]*\.svelte['"]/

/**
 * Runs before `vite-plugin-svelte` compiles a story, because auto-props is a
 * source rewrite: by the time the compiler has run there is nothing left to
 * rewrite (#233).
 */
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
        // The props are baked into this module, so Vite has to know it depends
        // on the file they were read from or the controls go stale on edit.
        this.addWatchFile(file)
        try {
          return extractPropDefs(await readFile(file, 'utf8'))
        }
        catch (error: any) {
          // A component that cannot be read is one without auto-props, not a
          // failed build — but it is worth saying so, because silence here is
          // indistinguishable from a component that declares nothing.
          this.warn(`[poveste] could not read props from ${file}: ${error.message}`)
          return undefined
        }
      })

      // Every insertion is newline-free, so positions stay on their own lines.
      return result === undefined ? undefined : { code: result, map: null }
    },
  }
}
