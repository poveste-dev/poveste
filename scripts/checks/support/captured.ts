/**
 * A capture group the pattern requires, as the string it always is.
 *
 * `noUncheckedIndexedAccess` types every group as possibly missing, including one
 * that cannot be. Defaulting it to `''` would hide a pattern edited into an
 * optional group, which is a check passing on nothing, so this throws instead.
 */
export function captured(match: RegExpMatchArray, group = 1): string {
  const value = match[group]
  if (value === undefined) {
    throw new Error(`capture group ${group} took no part in matching ${JSON.stringify(match[0])}`)
  }
  return value
}
