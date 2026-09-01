import { describe, expect, it } from 'vitest'
import { shouldWarnAboutMissingInitState } from './init-state-warning.js'

const base = {
  hasInitState: false,
  seeded: false,
  slotName: 'controls',
  hasControlsSlot: true,
  alreadyWarned: false,
}

describe('shouldWarnAboutMissingInitState', () => {
  it('warns when a controls slot has no state seeded from anywhere', () => {
    expect(shouldWarnAboutMissingInitState(base)).toBe(true)
  })

  // #462: `StateOption` declares initState on the Story and controls on the
  // Variant, so the variant's own prop is absent while the state is seeded — and
  // the author was told working controls were broken.
  it('stays quiet when the story seeded the state', () => {
    expect(shouldWarnAboutMissingInitState({ ...base, seeded: true })).toBe(false)
  })

  it('stays quiet when the variant declares initState itself', () => {
    expect(shouldWarnAboutMissingInitState({ ...base, hasInitState: true })).toBe(false)
  })

  it('warns once', () => {
    expect(shouldWarnAboutMissingInitState({ ...base, alreadyWarned: true })).toBe(false)
  })

  // The two mounts do not share a realm for iframe layouts, so warning from the
  // story mount as well would double it.
  it('only warns from the controls mount', () => {
    expect(shouldWarnAboutMissingInitState({ ...base, slotName: 'default' })).toBe(false)
  })

  it('says nothing about a variant with no controls at all', () => {
    expect(shouldWarnAboutMissingInitState({ ...base, hasControlsSlot: false })).toBe(false)
  })
})
