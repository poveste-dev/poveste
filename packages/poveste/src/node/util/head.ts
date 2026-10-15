import type { UseHeadInput } from 'unhead/types'
import { createHead, transformHtmlTemplate } from 'unhead/server'

/**
 * The description a book's index page gets when its `head` sets none. Without
 * one, a search result and Lighthouse's SEO audit have nothing to read (#316).
 * Unhead keeps one `description` per page and a later entry wins, so a book's own
 * replaces this.
 */
export function defaultDescription(title: string): UseHeadInput {
  return { meta: [{ name: 'description', content: `${title}, a book of component stories.` }] }
}

export async function applyHeadTransform(html: string, head: UseHeadInput | undefined, defaults?: UseHeadInput): Promise<string> {
  const init = [defaults, head].filter((entry): entry is UseHeadInput => entry !== undefined)
  if (init.length === 0) {
    return html
  }
  // disableDefaults: don't inject unhead's `lang="en"` / viewport tags — Poveste's
  // own HTML template already provides viewport, and we shouldn't override it.
  const instance = createHead({ init, disableDefaults: true })
  return await transformHtmlTemplate(instance, html)
}
