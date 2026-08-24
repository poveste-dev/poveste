import type { Plugin as VitePlugin } from 'vite'
import { parseSync } from 'vite'

// The blocks `@vitejs/plugin-vue` compiles itself. Everything else — `<i18n>`,
// `<docs>`, any consumer block — is a custom block it passes through as raw text.
const STANDARD_BLOCKS = new Set(['script', 'template', 'style'])

/** Whether the code is a real ES module — what a block handler leaves behind. */
function hasModuleSyntax(code: string): boolean {
  const parsed = parseSync('block.js', code)
  // Raw data that is not valid JS at all (`{ "en": … }`, `action: export`) is
  // certainly not a handler's output.
  if (parsed.errors.length > 0) {
    return false
  }
  return parsed.program.body.some(
    node => node.type.startsWith('Export') || node.type === 'ImportDeclaration',
  )
}

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
 * block plugin — runs first and turns the block into a module; a block that is
 * a genuine module by then is left untouched, only raw source is replaced.
 * Recognised by its export/import syntax rather than the words `export`/`import`
 * appearing anywhere, so a translation whose value is literally "export" is
 * still emptied rather than run and thrown on.
 */
export function sfcCustomBlockFallback(): VitePlugin {
  return {
    name: 'poveste:sfc-custom-block-fallback',
    enforce: 'post',
    transform(code, id) {
      const type = id.match(/\?vue&type=([^&]+)/)?.[1]
      if (!type || STANDARD_BLOCKS.has(type) || hasModuleSyntax(code)) {
        return null
      }
      return { code: 'export default {}', map: null }
    },
  }
}
