/**
 * Whether the render now under way inside a realm reported a throw.
 *
 * The host cannot see inside the realm, so "did this render succeed" has to be
 * read off the two named messages it does see. A throw reaches
 * `app.config.errorHandler` during mount and `SANDBOX_READY` is emitted after
 * `await host.mount()` returns, so the order is always error-then-ready — which
 * makes a ready with nothing recorded since the render began a clean render.
 *
 * Clearing on the story and variant ids changing instead cleared the pair being
 * navigated *to*, so arriving at a broken story wiped its marker, and the fixed
 * story the comment was about was never reached at all: a file edited in place
 * keeps its ids, so that watcher did not fire on the one path it named (#597).
 */
export function createRenderTracker() {
  let threw = false

  return {
    /** A new render is starting: what the previous one reported no longer holds. */
    begin(): void {
      threw = false
    },
    threw(): void {
      threw = true
    },
    /** True when the render that has just reported ready said nothing before it. */
    wasClean(): boolean {
      return !threw
    },
  }
}
