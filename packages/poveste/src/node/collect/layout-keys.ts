/**
 * The keys of a story's `layout` that its `type` does not read.
 *
 * `StoryLayout` is a union, and its two members spell one idea two ways:
 * `iframe` on a single layout, `iframeGrid` on a grid. A key from the other
 * member is carried through untouched and read by nothing, so
 * `{ type: 'grid', iframe: false }` got iframes and nobody was told (#333).
 */
const READ_BY: Record<string, string[]> = {
  single: ['iframe', 'isolate'],
  grid: ['width', 'iframeGrid', 'isolate'],
}

/** What the author of a stray key meant, where the other layout has a key for it. */
const MEANT: Record<string, Record<string, string>> = {
  single: { iframeGrid: 'iframe' },
  grid: { iframe: 'iframeGrid' },
}

export function strayLayoutKeys(layout: unknown): string[] {
  if (!layout || typeof layout !== 'object') {
    return []
  }
  const { type, ...rest } = layout as Record<string, unknown>
  const read = READ_BY[String(type)]
  if (!read) {
    return [`layout.type is ${JSON.stringify(type)}, and a layout is 'single' or 'grid'`]
  }
  return Object.keys(rest)
    .filter(key => !read.includes(key))
    .map((key) => {
      const meant = MEANT[String(type)]?.[key]
      return `layout.${key} is not read by a ${type} layout, so it does nothing${meant ? `: use ${meant}` : ''}`
    })
}
