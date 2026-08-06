import { describe, expect, it } from 'vitest'
import { GLOBAL_LAYER_QUERY } from '../selectors.js'
import { USER_CSS_MARK_START, userCssScopePlugin } from '../vite-plugin.js'

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
