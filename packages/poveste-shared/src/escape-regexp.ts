/**
 * Escape a string so a `RegExp` built from it matches that string literally.
 *
 * `RegExp.escape` does exactly this and would be the obvious call. It landed in
 * Node 24, and the floor is now `>=24.15.0` (#1075), so every supported Node has
 * it — the reason this function existed is gone. What is left is that TypeScript
 * still does not type it, which was always the smaller half of the problem, and
 * that swapping the body is a behaviour change four call sites would have to be
 * re-read against. Worth doing, separately.
 *
 * It lives in `shared` because four call sites across three packages build a
 * pattern from a name they did not choose, and one of them from the consumer's
 * own project path.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
