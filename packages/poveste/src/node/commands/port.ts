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

type SocketOptions = Record<string, unknown>

function withoutOwnPort(options: unknown): SocketOptions {
  if (options === null || typeof options !== 'object') {
    return {}
  }
  const { port: _port, server: _server, ...rest } = options as SocketOptions
  return rest
}

/**
 * The book server's HMR socket settings: whatever the merged config asked for,
 * minus a port or server of its own, so Vite serves the socket on the book's port
 * and the browser dials the page's own origin. Vite takes these from `server.ws`
 * and from the deprecated `server.hmr` alike, so both are cleared.
 *
 * A socket on a second port was never routed on StackBlitz, which previews each
 * port on its own hostname, so a page opened before collection ended waited for
 * the list on a socket that never connected, and stayed blank (#1245). It is
 * also how `@nuxt/vite-builder`'s 24678 default made two books collide (#221).
 */
export function socketOnBookPort(server: { hmr?: unknown, ws?: unknown }): { hmr: SocketOptions, ws: SocketOptions } {
  return { hmr: withoutOwnPort(server.hmr), ws: withoutOwnPort(server.ws) }
}
