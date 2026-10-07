/**
 * Escapes a string so a `RegExp` built from it matches that string literally, for
 * the build configs and checks. Not `RegExp.escape`, which Node 22 does not have
 * (#1226); shipped code has its own copy in `poveste`'s `util/escape-regexp.ts`.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
