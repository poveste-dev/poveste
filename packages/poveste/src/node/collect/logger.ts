import type { Logger } from 'vite'

/**
 * The collection server's logger: `base`, less one message.
 *
 * Collection runs its modules in Node, through an environment Vite treats as a
 * browser's. A package's Node build importing `node:http` is then reported as
 * "externalized for browser compatibility", which is false of where it runs: 25
 * lines from `ofetch` in a Nuxt book, reading as errors about a build that worked
 * (#1203). The same line from the book's own server or build is about the
 * browser, and is left alone.
 */
export function collectionLogger(base: Logger): Logger {
  const quiet = (log: Logger['warn']): Logger['warn'] => (message, options) => {
    if (!message.includes('has been externalized for browser compatibility')) {
      log(message, options)
    }
  }
  // Assigned onto `base`, not spread from it: `hasWarned` is state its own methods set.
  return Object.assign(base, { warn: quiet(base.warn.bind(base)), warnOnce: quiet(base.warnOnce.bind(base)) })
}
