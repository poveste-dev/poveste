/**
 * Escapes a string so a `RegExp` built from it matches that string literally.
 *
 * Not `RegExp.escape`: Node 22, inside the supported range since #1226, does not
 * have it, and TypeScript's `ESNext` lib types it anyway, so the compiler says
 * nothing when it is used.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
