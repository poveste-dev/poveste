/**
 * Escape a string so a `RegExp` built from it matches that string literally.
 *
 * `RegExp.escape` does exactly this and would be the obvious call. It landed in
 * Node 24, the floor is now `>=24.15.0` (#1075), and TypeScript types it under
 * the `ESNext` lib every package here compiles against — so the reason this
 * function existed is gone. What is left is that the builtin escapes far more
 * aggressively: the pattern text changes at almost every call site while the
 * matching does not, which is a re-read of the call sites rather than a swap
 * (#1090).
 *
 * It lives in `shared` because four call sites across three packages build a
 * pattern from a name they did not choose, and one of them from the consumer's
 * own project path.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
