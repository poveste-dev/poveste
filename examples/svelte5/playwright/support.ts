// Not a `.spec.ts`, so Playwright does not collect it as a test file.

/**
 * A checkbox the story itself declares, excluding the auto-props group (#233),
 * which adds one per declared prop — `BaseButton` declares `disabled`, so an
 * unqualified checkbox matches two. Scoped to the group rather than the
 * prop-item class, which state-derived controls also carry.
 */
export const AUTHORED_CHECKBOX = '[role="checkbox"]:not(.poveste-controls-component-props *)'
