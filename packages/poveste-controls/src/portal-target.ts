// `poveste`'s `APP_SCOPE_ROOT`, spelled out rather than imported: it lives in
// the node package, and this one depends on `@poveste/shared`.
const APP_ROOT = '.poveste-app-root'

/**
 * Where a popper mounts, answered by the document that asks.
 *
 * A control renders in two realms. The chrome wraps itself in `.poveste-app-root`.
 * A story sandbox has no such element and tags its own `body` as the render root
 * instead, which is what keeps a teleported popper inside the user-CSS `@scope`
 * boundary — so `body` is the right answer there rather than a fallback.
 *
 * A fixed selector is what makes this worth a function: in the sandbox Teleport
 * takes a null target and renders nothing, so the control opens onto an empty
 * screen. In a production build Vue does not even warn.
 */
export function portalTarget(doc: Document = document): HTMLElement {
  return doc.querySelector<HTMLElement>(APP_ROOT) ?? doc.body
}
