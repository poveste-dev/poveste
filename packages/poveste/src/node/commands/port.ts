/**
 * Reads a `--port` value off the parsed CLI options.
 *
 * sade declares the flag as taking a value but does not enforce one, so
 * `poveste preview --port` arrives as the boolean `true` and reaches node's
 * listen validation, which rejects it with `ERR_INVALID_ARG_VALUE` and names
 * neither the flag nor the mistake. A non-numeric value fails the same way.
 */
export function resolvePort(value: unknown, command: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  // Checked by type, not by coercion: a valueless flag arrives as `true`, and
  // `Number(true)` is 1, a valid port that would bind to a privileged one.
  const port = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError(
      `--port needs a number between 0 and 65535, got ${JSON.stringify(value)}. Try \`poveste ${command} --port 6006\`.`,
    )
  }

  return port
}
