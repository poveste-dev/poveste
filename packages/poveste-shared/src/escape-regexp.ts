/**
 * Escape a string so a `RegExp` built from it matches that string literally.
 *
 * `RegExp.escape` does exactly this and would be the obvious call, but it
 * landed in Node 24 and every package here still accepts `^22.22.2` — so a
 * contributor on the floor version gets `TypeError: RegExp.escape is not a
 * function` rather than a diagnostic. (TypeScript 5.6 does not type it either,
 * which is the half you notice first and the one that matters less.)
 *
 * It lives in `shared` because four call sites across three packages build a
 * pattern from a name they did not choose, and one of them from the consumer's
 * own project path.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
