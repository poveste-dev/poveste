import type { Plugin as VitePlugin } from 'vite'
import { resolve } from 'pathe'
import { GLOBAL_LAYER_QUERY, USER_GLOBALS_LAYER } from './selectors.js'

const VIRTUAL_ID = 'virtual:$poveste-global-styles'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export interface GlobalStylesPluginOptions {
  files: string[]
  rootDir: string
}

export function globalStylesPlugin(opts: GlobalStylesPluginOptions): VitePlugin {
  return {
    name: 'poveste:style-isolation:global-styles',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return opts.files
        .map(f => `import ${JSON.stringify(`${resolve(opts.rootDir, f)}?${GLOBAL_LAYER_QUERY}`)}`)
        .join('\n')
    },
    transform(code, id) {
      if (!id.includes(`?${GLOBAL_LAYER_QUERY}`)) return null
      return {
        code: `@layer ${USER_GLOBALS_LAYER} {\n${code}\n}\n`,
        map: null,
      }
    },
  }
}

export function getGlobalStylesVirtualId(): string {
  return VIRTUAL_ID
}
