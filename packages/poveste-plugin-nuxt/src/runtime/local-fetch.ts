import type { App } from 'h3'
import { toWebHandler } from 'h3'

/**
 * A `fetch` that answers a path from the in-memory h3 app and sends any other
 * URL to the real `fetch`.
 *
 * unenv 1 provided this as `createCall` and `createFetch`, and unenv 2 removed
 * both (#74). An h3 app already answers a web `Request` through `toWebHandler`,
 * so no Node request and response shims are needed to reach it. The rule for
 * what stays local is unenv's: a URL starting with `/`.
 */
export function createLocalFetch(app: App, fallback: typeof fetch = globalThis.fetch) {
  const handle = toWebHandler(app)

  return (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString()
    if (!url.startsWith('/')) {
      return fallback(url, init)
    }
    return handle(new Request(new URL(url, 'http://localhost'), init))
  }
}
