import { describe, expect, it } from 'vitest'
import { createAutoBuildingObject, unindent } from '../codegen/util.js'

describe('unindent', () => {
  it('removes the shallowest indent from every line', () => {
    const code = ['    <button>', '      Click me', '    </button>'].join('\n')

    expect(unindent(code)).toBe(['<button>', '  Click me', '</button>'].join('\n'))
  })

  it('returns nothing for a block of blank lines', () => {
    // No non-blank line means no indent is ever measured. The variable holding it
    // was left unassigned, which TypeScript 6 reports (TS2454); the output is the
    // same either way, because a blank line cannot contain the text `undefined`.
    expect(unindent('\n   \n\t\n')).toBe('')
  })
})

describe('createAutoBuildingObject', () => {
  it('names a child by the path that reached it', () => {
    const { proxy } = createAutoBuildingObject()

    expect((proxy.user.name as any).__autoBuildingObjectGetKey).toBe('user.name')
  })

  it('hands back the same child for the same key', () => {
    const { proxy } = createAutoBuildingObject()

    expect(proxy.user).toBe(proxy.user)
  })

  it('formats a key through the formatter it was given', () => {
    const { proxy } = createAutoBuildingObject(key => `{{ ${key} }}`)

    expect(`${proxy.user.name}`).toBe('{{ user.name }}')
  })
})
