// A story whose component throws still renders — Vue routes the error to
// `console.error` and leaves the template on screen, so the book shows a broken
// component as if it worked (#323). Nothing in the app can observe that on its
// own: the throw never reaches `window.onerror`, so it has to be reported from
// inside the framework that swallowed it.
//
// This lives in `shared` because both the app and every plugin can import it,
// which keeps the sandbox-to-host contract in one place.

export const SANDBOX_ERROR = '__poveste:sandbox-error'

export interface StoryError {
  message: string
  stack?: string
  /**
   * Which occupant threw. A warm realm is retargeted rather than reloaded
   * (#240), so the host has to reject a report from the previous one.
   */
  storyId?: string
  variantId?: string
}

export function toStoryError(error: unknown): Pick<StoryError, 'message' | 'stack'> {
  if (error instanceof Error) {
    return { message: error.message || String(error), stack: error.stack }
  }
  return { message: typeof error === 'string' ? error : String(error) }
}

// Reports from inside the sandbox to the host. A no-op outside one, so a plugin
// can call it unconditionally — stories also render in the host document
// itself, where there is no parent to tell.
export function reportStoryError(error: unknown, occupant: Pick<StoryError, 'storyId' | 'variantId'> = {}): void {
  if (typeof window === 'undefined' || !window.parent || window.parent === window) {
    return
  }
  const payload: StoryError = { ...toStoryError(error), ...occupant }
  try {
    window.parent.postMessage({ type: SANDBOX_ERROR, ...payload }, window.location.origin)
  }
  catch {
    // Reporting a failure must not become one.
  }
}
