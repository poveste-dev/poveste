import { readFile } from 'node:fs/promises'
import { transformStoryAutoProps } from './auto-props.js'
import { extractPropDefs } from './props.js'

const storyFileRE = /\.story\.svelte$/

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
      if (!storyFileRE.test(id)) {
        return undefined
      }

      const result = await transformStoryAutoProps(code, async (specifier) => {
        const resolved = await this.resolve(specifier, id)
        if (!resolved) {
          return undefined
        }
        try {
          return extractPropDefs(await readFile(resolved.id.split('?')[0], 'utf8'))
        }
        catch {
          // A component this build cannot read is one without auto-props, not a
          // failed build.
          return undefined
        }
      })

      // Every insertion is newline-free, so positions stay on their own lines
      // and a null map is accurate rather than merely convenient.
      return result === undefined ? undefined : { code: result, map: null }
    },
  }
}
