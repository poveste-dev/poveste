import { describe, expect, it } from 'vitest'
import { bookProblems, CUSTOM_PRESET, presetsIn, specPresets, specProblems, toRendered } from './check-conformance-config.ts'

const DEFAULTS = [
  { label: 'Transparent', color: 'transparent', contrastColor: '#333' },
  { label: 'White', color: '#fff', contrastColor: '#333' },
]

const SPREADING = `
export default defineConfig({
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      label: 'Custom gray',
      color: '#cafff5',
      contrastColor: '#005142',
    },
  ],
  defaultBackgroundColor: 'transparent',
})
`

// Quasar's shape: its published recipe owns the import line, so a second import
// for `getDefaultConfig` fails lint and the six are spelled out (#543).
const LITERAL = `
export default defineConfig({
  backgroundPresets: [
    { label: 'Transparent', color: 'transparent', contrastColor: '#333' },
    { label: 'White', color: '#fff', contrastColor: '#333' },
    { label: 'Custom gray', color: '#cafff5', contrastColor: '#005142' },
  ],
  defaultBackgroundColor: 'transparent',
})
`

describe('presetsIn', () => {
  it('reads presets written one per line', () => {
    expect(presetsIn(SPREADING)).toEqual([CUSTOM_PRESET])
  })

  it('reads presets written one per object, which is how Quasar spells them', () => {
    expect(presetsIn(LITERAL).map(preset => preset.label)).toEqual(['Transparent', 'White', 'Custom gray'])
  })

  it('is empty rather than throwing when a file declares none', () => {
    expect(presetsIn('export default defineConfig({})')).toEqual([])
  })

  // Depth counting, not the first `]`: a preset list containing a nested array
  // would otherwise be cut in half and read as complete.
  it('reads to the end of the array rather than the first bracket', () => {
    const source = `backgroundPresets: [{ label: 'A', color: '#000', contrastColor: '#fff', extra: [1] }, { label: 'B', color: '#111', contrastColor: '#eee' }]`

    expect(presetsIn(source).map(preset => preset.label)).toEqual(['A', 'B'])
  })
})

describe('toRendered', () => {
  it('expands a three-digit hex the way a browser reports it', () => {
    expect(toRendered('#fff')).toBe('rgb(255, 255, 255)')
  })

  it('reads a six-digit hex', () => {
    expect(toRendered('#cafff5')).toBe('rgb(202, 255, 245)')
  })

  // The default, and the one value that is not a hex triple — getting it wrong
  // would make the first preset silently unverifiable.
  it('renders transparent as the rgba the browser reports', () => {
    expect(toRendered('transparent')).toBe('rgba(0, 0, 0, 0)')
  })
})

describe('specProblems', () => {
  const rendered = [
    { bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' },
    { bg: 'rgb(255, 255, 255)', contrast: 'rgb(51, 51, 51)' },
  ]

  it('is silent when the spec matches the declared presets', () => {
    expect(specProblems(DEFAULTS, rendered)).toEqual([])
  })

  // The state this exists for: the defaults move and the rgb list does not.
  it('names the preset whose color drifted', () => {
    const drifted = [rendered[0], { bg: 'rgb(254, 255, 255)', contrast: 'rgb(51, 51, 51)' }]

    expect(specProblems(DEFAULTS, drifted)[0]).toMatch(/preset 1 is rgb\(254, 255, 255\)/)
  })

  it('reports a count mismatch rather than comparing a short list position by position', () => {
    expect(specProblems(DEFAULTS, [rendered[0]])[0]).toMatch(/asserts 1 presets and the books declare 2/)
  })

  // The spec indexes by position, so a reorder keeps every value and asserts
  // the wrong button.
  it('catches a reorder, which a set comparison would pass', () => {
    expect(specProblems(DEFAULTS, [rendered[1], rendered[0]])).toHaveLength(2)
  })

  it('reports a spec it cannot read rather than passing on an empty list', () => {
    expect(specProblems(DEFAULTS, [])[0]).toMatch(/no `const presets` list/)
  })
})

describe('bookProblems', () => {
  it('accepts a book that spreads the defaults', () => {
    expect(bookProblems('vue3', 'f.ts', SPREADING, DEFAULTS)).toEqual([])
  })

  it('accepts a book that lists the defaults literally, since Quasar cannot spread them', () => {
    expect(bookProblems('quasar', 'f.ts', LITERAL, DEFAULTS)).toEqual([])
  })

  // The #499 failure: every story present, eighteen specs red, and the message
  // was a preset count.
  it('names the missing custom preset and what it costs', () => {
    const source = SPREADING.replace(/\{\s*label: 'Custom gray',[\s\S]*?\},/, '')

    expect(bookProblems('vue3', 'f.ts', source, DEFAULTS)[0]).toMatch(/does not declare the `Custom gray` preset/)
  })

  it('names a literal copy that has drifted from the defaults', () => {
    const source = LITERAL.replace(`color: '#fff'`, `color: '#ffe'`)

    expect(bookProblems('quasar', 'f.ts', source, DEFAULTS)[0]).toMatch(/nor declares `White`/)
  })

  it('names a book that does not set the default background', () => {
    const source = SPREADING.replace(`defaultBackgroundColor: 'transparent',`, '')

    expect(bookProblems('vue3', 'f.ts', source, DEFAULTS)[0]).toMatch(/defaultBackgroundColor/)
  })

  it('reports every problem at once, so one run says what to write', () => {
    expect(bookProblems('new', 'f.ts', 'export default defineConfig({})', DEFAULTS)).toHaveLength(3)
  })
})

describe('specPresets', () => {
  it('reads the rendered list the spec compares against', () => {
    const source = `const presets = [\n  { name: 'transparent', bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' },\n]\n`

    expect(specPresets(source)).toEqual([{ bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' }])
  })
})
