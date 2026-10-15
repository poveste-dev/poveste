import { describe, expect, it } from 'vitest'
import { checkControlsReference, GUIDES, referenceProblems, registeredComponents } from './controls-reference.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'

const INDEX = `
export const HstTooltip = HstTooltipVue
export const components = {
  HstText,
  HstColor,
}
`

function guides(vue: string, svelte: string) {
  return [
    { ...GUIDES[0]!, text: vue },
    { ...GUIDES[1]!, text: svelte },
  ]
}

describe('registeredComponents', () => {
  it('reads the keys of the components object, and nothing exported beside it', () => {
    expect(registeredComponents(INDEX)).toEqual(['HstText', 'HstColor'])
  })
})

describe('referenceProblems', () => {
  it('passes when both guides name every component in their own spelling', () => {
    expect(referenceProblems(['HstText', 'HstColor'], guides('`HstText` `HstColor`', '`Hst.Text` `Hst.Color`'))).toEqual([])
  })

  it('names a component one guide leaves out, and the guide', () => {
    const problems = referenceProblems(['HstText', 'HstColor'], guides('`HstText` `HstColor`', '`Hst.Text`'))

    expect(problems).toEqual([expect.stringMatching(/svelte[\\/]controls\.md does not name `Hst\.Color`/)])
  })

  it('does not take the other framework\'s spelling as a mention', () => {
    expect(referenceProblems(['HstText'], guides('`HstText`', '`HstText`'))).toHaveLength(1)
  })

  it('reports a components object it cannot read, rather than passing', () => {
    expect(referenceProblems([], guides('', ''))).toEqual([expect.stringContaining('no `components` object')])
  })
})

describe('the repository', () => {
  it('names every registered component in both controls guides', { tags: ['check', 'controls', 'docs'] }, () => {
    assertNoProblems(checkControlsReference())
  })
})
