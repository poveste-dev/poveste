export const omitInheritStoryProps = [
  'id',
  'title',
  'group',
  'layout',
  'variants',
  'file',
  'slots',
  'lastSelectedVariant',
  // The Docs tab belongs to the story, not to a variant (#1398).
  'autoDocs',
]

/**
 * Auto-props bookkeeping, which is not story state.
 *
 * `_hPropState` is keyed by a component's index *within one variant*, so it only
 * means anything next to the `_hPropDefs` it was recorded against. Sharing
 * either across variants cannot be right, and doing so made one variant's
 * control edit reach every other variant in the story (#473).
 */
export const autoPropsStateKeys = [
  '_hPropDefs',
  '_hPropState',
]
