import { describe, expect, it } from 'vitest'
import { GLOBAL_LAYER_QUERY } from '../selectors.js'
import { SANDBOX_FLAG, sandboxCssPlugin, USER_CSS_MARK_START, userCssScopePlugin } from '../vite-plugin.js'

function transform(id: string, code = 'body { color: red }', enabled = true) {
  const plugin = userCssScopePlugin({ enabled })
  return (plugin.transform as any).call({}, code, id) as { code: string } | null
}

describe('userCssScopePlugin', () => {
  it('marks user CSS so the merger can wrap it per entry', () => {
    expect(transform('/project/src/poveste.css')?.code).toContain(USER_CSS_MARK_START)
  })

  it('marks style blocks of single-file components', () => {
    expect(transform('/project/src/Foo.vue?vue&type=style&index=0&lang.css')?.code).toContain(USER_CSS_MARK_START)
  })

  it('leaves chrome CSS alone', () => {
    expect(transform('/project/node_modules/@poveste/app/dist/style.css')).toBeNull()
    expect(transform('/project/node_modules/@poveste/controls/dist/index.es.css')).toBeNull()
  })

  it('leaves non-CSS alone', () => {
    expect(transform('/project/src/main.ts')).toBeNull()
  })

  it('leaves ?global imports unscoped', () => {
    expect(transform('/project/src/tokens.css?global')).toBeNull()
  })

  it('leaves globalStyles files unscoped — they belong to the chrome page', () => {
    expect(transform(`/project/src/tokens.css?${GLOBAL_LAYER_QUERY}`)).toBeNull()
  })

  it('does nothing when isolation is disabled', () => {
    expect(transform('/project/src/poveste.css', 'body {}', false)).toBeNull()
  })
})

describe('sandboxCssPlugin', () => {
  const id = '/project/src/poveste.css'

  // Vite's dev CSS module, as `vite:css-post` emits it.
  function viteModule(css: string) {
    return [
      `import { updateStyle as __vite__updateStyle } from "/@vite/client"`,
      `const __vite__id = ${JSON.stringify(id)}`,
      `const __vite__css = ${JSON.stringify(css)}`,
      `__vite__updateStyle(__vite__id, __vite__css)`,
    ].join('\n')
  }

  function serve(css: string, moduleFor = viteModule) {
    const sources = new Map<string, string>()
    const wrapped = (userCssScopePlugin({ enabled: true, mode: 'wrap', sources }).transform as any).call({}, css, id).code
    const result = (sandboxCssPlugin(sources).transform as any).call({}, moduleFor(wrapped), id) as { code: string } | null
    return { wrapped, result }
  }

  function sheetIn(code: string, sandbox: boolean): string {
    const declaration = code.split('\n').find(line => line.startsWith('const __vite__css'))!
    // eslint-disable-next-line no-new-func
    return new Function(`const globalThis = { ${SANDBOX_FLAG}: ${sandbox} }\n${declaration}\nreturn __vite__css`)()
  }

  it('gives the sandbox iframe the sheet as written', () => {
    const { result } = serve(':root { --brand: #c80000 }')

    expect(sheetIn(result!.code, true)).toBe(':root { --brand: #c80000 }')
  })

  it('gives the app the wrapped sheet', () => {
    const { wrapped, result } = serve(':root { --brand: #c80000 }')

    expect(sheetIn(result!.code, false)).toBe(wrapped)
  })

  it('leaves a module in any other shape wrapped', () => {
    const { result } = serve(':root { --brand: #c80000 }', css => `export default ${JSON.stringify(css)}`)

    expect(result).toBeNull()
  })
})
