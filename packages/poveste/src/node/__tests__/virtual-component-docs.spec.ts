import type { Context } from '../context.js'
import { describe, expect, it } from 'vitest'
import { componentDoc, componentDocsMap } from '../virtual/component-docs.js'

const button = { doc: { props: [{ name: 'label', type: 'string', required: true, tags: [] }], slots: [], events: [] } }
const card = { doc: { props: [], slots: [{ name: 'default', tags: [] }], events: [] } }

function book(componentDocs: Context['componentDocs']) {
  return { componentDocs } as Context
}

describe('a built book\'s docs data', () => {
  it('maps each story to a chunk per component, one for a component two stories import', () => {
    const ctx = book({ button: { 'src/Button.vue': button }, card: { 'src/Button.vue': button, 'src/Card.vue': card } })

    const map = componentDocsMap(ctx)

    expect(map.match(/virtual:component-docs-data:0/g)).toHaveLength(2)
    expect(map.match(/virtual:component-docs-data:1/g)).toHaveLength(1)
  })

  it('puts one component\'s table in its chunk', async () => {
    const ctx = book({ button: { 'src/Button.vue': button }, card: { 'src/Card.vue': card } })

    const code = componentDoc(ctx, '/__resolved__virtual:component-docs-data:1')!

    expect(code).toMatch(/^export default JSON\.parse\(/)
    expect((await import(`data:text/javascript,${encodeURIComponent(code)}`)).default).toEqual(card)
  })

  it('answers no chunk for an index it never handed out', () => {
    expect(componentDoc(book({ button: { 'src/Button.vue': button } }), '/__resolved__virtual:component-docs-data:5')).toBeUndefined()
  })

  it('maps nothing when nothing was extracted, as in dev', () => {
    expect(componentDocsMap(book(undefined))).toBe('export const componentDocs = {}\n')
  })
})
