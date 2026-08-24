import type { Plugin as VitePlugin } from 'vite'

// The blocks `@vitejs/plugin-vue` compiles itself. Everything else — `<i18n>`,
// `<docs>`, any consumer block — is a custom block it passes through as raw text.
const STANDARD_BLOCKS = new Set(['script', 'scriptSetup', 'template', 'style'])

/**
 * Neutralise an SFC custom block that nothing handled.
 *
 * `<i18n>` and friends reach the module runner as their raw YAML/JSON, which
 * then throws when it is run as JavaScript — `en:\n  hello: Hello` reads as a
 * reference to `Hello` (#65). Poveste only collects a story's structure, and a
 * block it cannot interpret contributes nothing to that, so an unhandled one
 * becomes an empty module.
 *
 * `enforce: 'post'` so a real handler — `@intlify/unplugin-vue-i18n`, a consumer
 * block plugin — runs first and turns the block into a module; its output is
 * left untouched, only a block still carrying its raw source is replaced.
 */
export function sfcCustomBlockFallback(): VitePlugin {
  return {
    name: 'poveste:sfc-custom-block-fallback',
    enforce: 'post',
    transform(code, id) {
      const type = id.match(/\?vue&type=([^&]+)/)?.[1]
      if (!type || STANDARD_BLOCKS.has(type)) {
        return null
      }
      // A handler leaves a real module behind; raw block text has neither.
      if (/\bexport\b/.test(code) || /\bimport\b/.test(code)) {
        return null
      }
      return { code: 'export default {}', map: null }
    },
  }
}
