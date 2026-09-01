/**
 * Whether to warn that a variant has controls but no `initState`.
 *
 * The warning is real — a controls snippet with no seeded state renders controls
 * whose edits cannot reach the story, because the story is mounted separately per
 * slot. But it fired on stories where the state *is* seeded, from `initState` on
 * the `Story` rather than the `Variant`, and told their authors that working
 * controls were broken (#462).
 *
 * `seeded` is the signal it was missing: `RenderStory` sets `__pvtStateSeeded`
 * when it applies a story-level `initState`, on the same object this already
 * holds. Only the variant-level check was wrong; the story-level one is correct.
 */
export function shouldWarnAboutMissingInitState(options: {
  hasInitState: boolean
  seeded: boolean
  slotName: string
  hasControlsSlot: boolean
  alreadyWarned: boolean
}): boolean {
  const { hasInitState, seeded, slotName, hasControlsSlot, alreadyWarned } = options

  if (hasInitState || seeded || alreadyWarned) {
    return false
  }

  // Controls mount only: the two mounts do not share a realm for iframe layouts,
  // so this is what keeps it to one warning.
  return slotName === 'controls' && hasControlsSlot
}
