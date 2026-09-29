// Externalised deps load through native Node ESM, which Vite never applies `define`
// to, so a compile-time flag is an undefined identifier in a collection worker —
// vue-i18n reading `__VUE_PROD_DEVTOOLS__` was the reported case (#284).

// Narrow on purpose: a browser-targeted `define: { process: '{"env":{}}' }` would
// otherwise overwrite the worker's own `process`, far from the config that caused it.
const FEATURE_FLAG = /^__[A-Z0-9_]+__$/

// `define` values are expression *source*, so a user's `define: { X: 'false' }` arrives
// as the string `"false"` and seeding it verbatim would invert the flag.
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
