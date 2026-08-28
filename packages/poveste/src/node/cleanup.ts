import type { Awaitable } from '@poveste/shared'
import { wrapLogError } from './util/log.js'

/**
 * Teardown for things a plugin opens while the config is being resolved, before
 * any command hook has run.
 *
 * `onBuild`'s own `onCleanup` covers what a plugin opens during a build. It cannot
 * cover what already existed: `@poveste/plugin-nuxt` loads Nuxt in `defaultConfig`,
 * so between that and the `onBuild` loop there is a window — finding the stories,
 * resolving the Vite config, starting the collection server — where a failure left
 * Nuxt running with nothing registered to close it (#434).
 *
 * Registered here, its lifetime starts where the resource does.
 */
const callbacks: (() => Awaitable<void>)[] = []

export function onPovesteCleanup(cb: () => Awaitable<void>): void {
  callbacks.push(cb)
}

/**
 * Runs every registered callback and forgets them, so a `poveste dev` restart does
 * not close the same thing twice. Logged rather than thrown: a teardown that fails
 * must not replace whatever failure brought us here.
 */
export async function runPovesteCleanups(): Promise<void> {
  const pending = callbacks.splice(0, callbacks.length)
  for (const cb of pending) {
    await wrapLogError('poveste.cleanup', () => cb())
  }
}
