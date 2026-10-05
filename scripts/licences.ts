// What a published package may ship or depend on, by licence (#936).
//
// Shared by the build, which writes the notices for what it bundles, and by the
// check over the runtime dependency tree, so the two cannot disagree.

/** SPDX ids a shipped package may carry. Anything else needs a reason beside it here. */
export const ALLOWED_LICENCES: Record<string, string> = {
  'MIT': 'permissive',
  'ISC': 'permissive',
  'BSD-2-Clause': 'permissive',
  'BSD-3-Clause': 'permissive',
  'Apache-2.0': 'permissive; bundled copies carry its NOTICE file too',
  '0BSD': 'permissive',
  'BlueOak-1.0.0': 'permissive',
  'CC0-1.0': 'public-domain dedication',
  'Python-2.0': 'permissive',
  'PSF-2.0': 'the Python licence under its current SPDX id; argparse 3 declares it where argparse 2 declared Python-2.0',
  'MIT-0': 'MIT without the attribution clause, so less demanding than MIT',
  'Unlicense': 'a public-domain dedication, like CC0-1.0',
  'MPL-2.0': 'weak copyleft per file: its obligations attach to MPL files a distributor modifies. Only installed as unmodified dependencies, lightningcss for poveste and the Ghostery adblocker for plugin-screenshot; bundling MPL code would need its source offered',
  'OFL-1.1': 'the chrome\'s font, Noto Sans Display, shipped in @poveste/app with its licence; OFL permits redistribution inside other software and forbids only selling the font on its own',
}

/** The licence a manifest declares, as one SPDX expression, or undefined when it declares none. */
export function declaredLicence(manifest: { license?: unknown, licenses?: unknown }): string | undefined {
  const { license, licenses } = manifest
  if (typeof license === 'string' && license.trim()) {
    return license.trim()
  }
  if (license && typeof license === 'object' && typeof (license as { type?: unknown }).type === 'string') {
    return (license as { type: string }).type
  }
  if (Array.isArray(licenses)) {
    const types = licenses.map(entry => (entry as { type?: unknown })?.type).filter((type): type is string => typeof type === 'string')
    return types.length > 0 ? types.join(' OR ') : undefined
  }
  return undefined
}

/**
 * Why `expression` is not allowed, or undefined when it is.
 *
 * An `OR` is allowed when one side is, an `AND` only when both are. Anything
 * that does not parse as that is refused rather than guessed at.
 */
export function licenceProblem(expression: string | undefined, allowed: Record<string, string> = ALLOWED_LICENCES): string | undefined {
  if (!expression) {
    return 'declares no licence'
  }
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? []
  let index = 0

  function parseOr(): boolean | undefined {
    let result = parseAnd()
    while (tokens[index] === 'OR') {
      index++
      const right = parseAnd()
      result = result === undefined || right === undefined ? undefined : result || right
    }
    return result
  }
  function parseAnd(): boolean | undefined {
    let result = parseTerm()
    while (tokens[index] === 'AND') {
      index++
      const right = parseTerm()
      result = result === undefined || right === undefined ? undefined : result && right
    }
    return result
  }
  function parseTerm(): boolean | undefined {
    const token = tokens[index++]
    if (token === '(') {
      const inner = parseOr()
      return tokens[index++] === ')' ? inner : undefined
    }
    if (!token || token === ')' || token === 'AND' || token === 'OR' || token === 'WITH') {
      return undefined
    }
    return token in allowed
  }

  const verdict = parseOr()
  if (verdict === undefined || index !== tokens.length) {
    return `declares a licence that does not parse: ${expression}`
  }
  return verdict ? undefined : `is licensed ${expression}, which is not in the allow-list`
}
