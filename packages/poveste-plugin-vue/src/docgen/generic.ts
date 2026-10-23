// A tag's attributes may hold a `>`, as `generic="T extends Record<string, unknown>"` does,
// so a quoted value is read whole rather than ending the tag.
const SCRIPT_TAG = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g
const SETUP = /(?:^|\s)setup(?=[\s=]|$)/
const GENERIC = /(?:^|\s)generic\s*=\s*(?:"([^"]*)"|'([^']*)')/

/**
 * The type parameters a `<script setup generic="…">` declares, constraints and defaults
 * included, so a table that prints `T | T[]` can say what `T` may be (#1436).
 */
export function readGeneric(source: string): string | undefined {
  for (const [, attributes] of source.matchAll(SCRIPT_TAG)) {
    if (SETUP.test(attributes!)) {
      const found = GENERIC.exec(attributes!)
      const generic = (found?.[1] ?? found?.[2])?.replace(/\s+/g, ' ').trim()
      return generic || undefined
    }
  }
  return undefined
}
