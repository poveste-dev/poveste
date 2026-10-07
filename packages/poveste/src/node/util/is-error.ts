const native = (Error as { isError?: (value: unknown) => boolean }).isError

/**
 * `Error.isError` where the Node has it, which is from 24; Node 22, inside the
 * supported range since #1226, does not. The fallback gives the same answer for
 * what these call sites see: an error from another realm, jsdom's included, still
 * reports `[object Error]`, and jsdom's `DOMException` fails both.
 */
export function isError(value: unknown): value is Error {
  return native ? native(value) : Object.prototype.toString.call(value) === '[object Error]'
}
