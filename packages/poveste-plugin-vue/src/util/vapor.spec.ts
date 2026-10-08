import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { hasVaporInterop, vaporInteropModule, withoutVapor } from './vapor.js'

describe('withoutVapor', () => {
  it('drops the attribute from a `<script setup vapor>`', () => {
    expect(withoutVapor('<script setup vapor lang="ts">\nconst a = 1\n</script>')).toBe('<script setup lang="ts">\nconst a = 1\n</script>')
  })

  it('drops it wherever it sits in the tag, and from `<template>`', () => {
    expect(withoutVapor('<script vapor setup>\n</script>\n<template vapor>\n<p/>\n</template>')).toBe('<script setup>\n</script>\n<template>\n<p/>\n</template>')
  })

  it('leaves an ordinary SFC alone, so the transform returns nothing', () => {
    expect(withoutVapor('<script setup>\n</script>\n<template><p>vapor</p></template>')).toBeUndefined()
  })

  it('does not touch the word inside the template', () => {
    expect(withoutVapor('<template vapor><p class="vapor">vapor</p></template>')).toBe('<template><p class="vapor">vapor</p></template>')
  })
})

// Against the release that has Vapor, pinned, so a later RC or the stable
// release changing either side fails here rather than in a reader's book
// (#1153). `vue-vapor-rc` is an npm alias of `vue@3.6.0-rc.10`.
describe('a Vapor SFC under Vue 3.6', () => {
  const require = createRequire(import.meta.url)
  // What collection gets for `vue`: Node resolves its CommonJS entry.
  const nodeVue: Record<string, unknown> = require('vue-vapor-rc')
  const compiler = require('vue-vapor-rc/compiler-sfc')

  const SOURCE = '<script setup vapor lang="ts">\ndefineProps<{ label: string }>()\n</script>\n\n<template vapor>\n  <button>{{ label }}</button>\n</template>\n'

  function importsFromVue(source: string): string[] {
    const { descriptor } = compiler.parse(source, { filename: 'Button.vue' })
    const { content } = compiler.compileScript(descriptor, { id: 'button', inlineTemplate: true })
    return [...content.matchAll(/import \{([^}]+)\} from ['"]vue['"]/g)]
      .flatMap((match: RegExpMatchArray) => (match[1] ?? '').split(','))
      .map((name: string) => name.trim().split(' as ')[0]!)
      .filter(Boolean)
  }

  it('compiles to imports the Node entry of `vue` does not have, which is the failure', () => {
    const missing = importsFromVue(SOURCE).filter(name => !(name in nodeVue))

    expect(missing).toContain('defineVaporComponent')
  })

  it('compiles, once collection drops `vapor`, to imports the Node entry has', () => {
    const missing = importsFromVue(withoutVapor(SOURCE)!).filter(name => !(name in nodeVue))

    expect(missing).toEqual([])
  })
})

describe('hasVaporInterop', () => {
  it('is false for Vue 3.5, which has no Vapor runtime', () => {
    expect(hasVaporInterop('3.5.43')).toBe(false)
  })

  it('is true for a 3.6 prerelease', () => {
    expect(hasVaporInterop('3.6.0-rc.10')).toBe(true)
  })

  it('is true for a later major', () => {
    expect(hasVaporInterop('4.0.0')).toBe(true)
  })

  it('is false when the project has no Vue to read', () => {
    expect(hasVaporInterop(undefined)).toBe(false)
  })
})

describe('vaporInteropModule', () => {
  it('re-exports the plugin from a Vue that has it', () => {
    expect(vaporInteropModule('3.6.0')).toBe(`export { vaporInteropPlugin as default } from 'vue'\n`)
  })

  it('exports nothing usable from one that does not, so a 3.5 build has no import to warn about', () => {
    expect(vaporInteropModule('3.5.43')).toBe(`export default undefined\n`)
  })
})
