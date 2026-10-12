import { describe, expect, it } from 'vitest'
import Stub from '../client/Stub.svelte'
import { collectHst } from './hst.js'
import Story from './Story.svelte'
import Variant from './Variant.svelte'

describe('the Hst a story is collected with', () => {
  it('keeps the two members that collect', () => {
    expect(collectHst()['Story']).toBe(Story)
    expect(collectHst()['Variant']).toBe(Variant)
  })

  // `Hst.Select` was undefined here and defined where the story renders, so a
  // control in a story's default slot threw while the book was collected (#925).
  it.for(['Select', 'Text', 'Button', 'ColorSelect'])('gives a story Hst.%s to render, as a component that renders nothing', (name) => {
    expect(collectHst()[name]).toBe(Stub)
  })

  it('answers nothing for a name no component could have', () => {
    expect(collectHst()['then']).toBeUndefined()
    expect(Reflect.get(collectHst(), Symbol.iterator)).toBeUndefined()
  })
})
