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

/**
 * The HMR socket port for a book served on `devPort`. Derived from the dev port
 * so each concurrent dev server's socket is as distinct as its book port (#175),
 * offset clear of the usual dev-port range and wrapped so it stays a valid port
 * for an unusually high `--port`. `@nuxt/vite-builder` otherwise pins every
 * server to the framework default (24678), a constant that collides (#221).
 */
export function hmrPortFor(devPort: number | undefined): number {
  const base = devPort ?? 6006
  return base < 45536 ? base + 20000 : base - 20000
}
