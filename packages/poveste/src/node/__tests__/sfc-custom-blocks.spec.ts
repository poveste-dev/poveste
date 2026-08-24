import { describe, expect, it } from 'vitest'
import { sfcCustomBlockFallback } from '../sfc-custom-blocks.js'

// The plugin's `transform` is a plain function of (code, id); call it directly.
function transform(code: string, id: string) {
  const plugin = sfcCustomBlockFallback()
  const hook = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform!.handler
  return hook.call({} as any, code, id) as { code: string } | null
}

const I18N_BLOCK = 'Button.vue?vue&type=i18n&index=0&lang.i18n'
const RAW_YAML = '\nen:\n  hello: Hello\n'

describe('the SFC custom-block fallback', () => {
  it('empties an unhandled block carrying its raw source', () => {
    expect(transform(RAW_YAML, I18N_BLOCK)?.code).toBe('export default {}')
  })

  it('leaves a block a real handler already turned into a module', () => {
    // What `@intlify/unplugin-vue-i18n` leaves behind, roughly.
    const handled = 'export default function (Component) { Component.i18n = { en: { hello: \'Hello\' } } }'

    expect(transform(handled, I18N_BLOCK)).toBeNull()
  })

  it('ignores the blocks plugin-vue compiles itself', () => {
    expect(transform('.a { color: red }', 'Button.vue?vue&type=style&index=0&lang.css')).toBeNull()
    expect(transform('export default {}', 'Button.vue?vue&type=script&setup=true&lang.ts')).toBeNull()
    expect(transform('export function render() {}', 'Button.vue?vue&type=template')).toBeNull()
  })

  it('ignores a module that is not an SFC block at all', () => {
    expect(transform(RAW_YAML, '/src/data.yaml')).toBeNull()
  })
})
