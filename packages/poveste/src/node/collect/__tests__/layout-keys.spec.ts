import { describe, expect, it } from 'vitest'
import { strayLayoutKeys } from '../layout-keys.js'

describe('a layout key its type does not read', () => {
  // The story this was found on: it asked a grid for no iframes in the single
  // layout's words, and got iframes (#333).
  it('is named, with the key the other layout uses for it', () => {
    expect(strayLayoutKeys({ type: 'grid', width: '200px', iframe: false }))
      .toEqual(['layout.iframe is not read by a grid layout, so it does nothing: use iframeGrid'])
    expect(strayLayoutKeys({ type: 'single', iframeGrid: false }))
      .toEqual(['layout.iframeGrid is not read by a single layout, so it does nothing: use iframe'])
  })

  it('is named with no suggestion where the other layout has no word for it', () => {
    expect(strayLayoutKeys({ type: 'single', width: 200 }))
      .toEqual(['layout.width is not read by a single layout, so it does nothing'])
  })

  it('is not reported for the keys each layout does read', () => {
    expect(strayLayoutKeys({ type: 'single', iframe: false, isolate: true })).toEqual([])
    expect(strayLayoutKeys({ type: 'grid', width: 200, iframeGrid: false, isolate: true })).toEqual([])
  })

  it('reports a type that is neither layout', () => {
    expect(strayLayoutKeys({ type: 'gird', width: 200 })).toEqual(['layout.type is "gird", and a layout is \'single\' or \'grid\''])
  })

  it('has nothing to say about a story with no layout', () => {
    expect(strayLayoutKeys(undefined)).toEqual([])
  })
})
