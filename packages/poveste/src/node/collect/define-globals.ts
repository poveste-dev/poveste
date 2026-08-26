// Story collection runs in a Node worker. Externalised dependencies are loaded by
// native Node ESM, so Vite never applies `define` to them — and a bare compile-time
// feature flag is just an undefined identifier there. vue-i18n reading
// `__VUE_PROD_DEVTOOLS__` was the reported case (#284); anything with build-time
// flags fails the same way.
//
// The fix is to give the collection environment the same values a real build would
// substitute, taken from Vite's own resolved `define` rather than a list of library
// names this package would have to keep current.

// Only `__FLAG__`-shaped keys are seeded. Every flag this exists for follows that
// convention — `__VUE_OPTIONS_API__`, `__VUE_PROD_DEVTOOLS__`, `__VUE_I18N_LEGACY_API__`,
// `__INTLIFY_PROD_DEVTOOLS__` — and narrow is the right failure here. A browser-targeted
// config shimming a Node global (`define: { process: '{"env":{}}' }` is a real shape)
// would otherwise replace the collection worker's own `process`, surfacing far from the
// config that caused it. Refusing to evaluate arbitrary expressions while letting
// arbitrary identifiers overwrite the runtime would be a guard in name only.
// `process.env.NODE_ENV` and friends fail the same test, being member expressions.
const FEATURE_FLAG = /^__[A-Z0-9_]+__$/

// Vite `define` values are JS expression *source*. A plugin-injected flag arrives
// already parsed (`false`), while a user's `define: { X: 'false' }` arrives as the
// string `"false"` — and seeding that string would make the flag *truthy*, silently
// inverting it. So strings are parsed as literals, and anything that is not a literal
// is skipped: evaluating arbitrary expressions here is not something this should do.
export function globalsFromDefine(define: Record<string, unknown> | undefined): Record<string, unknown> {
  const globals: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(define ?? {})) {
    if (!FEATURE_FLAG.test(key)) {
      continue
    }

    if (typeof value !== 'string') {
      globals[key] = value
      continue
    }

    try {
      globals[key] = JSON.parse(value)
    }
    catch {
      // Not a literal — leave it undefined rather than guess at it.
    }
  }

  return globals
}
