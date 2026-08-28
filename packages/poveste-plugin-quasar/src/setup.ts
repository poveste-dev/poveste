import type { App } from 'vue'
import { Quasar } from 'quasar'
import 'quasar/src/css/index.sass'

/**
 * A Quasar boot file. Quasar hands these the router, the store and the SSR
 * context as well; a story has none of those, so only `app` is passed and a boot
 * file needing more has to be split or guarded.
 */
export type BootFile = (params: { app: App }) => unknown

export interface SetupQuasarOptions {
  /** Passed to `app.use(Quasar, …)` — Quasar's own plugin options. */
  quasar?: Record<string, unknown>
  /**
   * Boot files to run. Poveste renders stories in its own app, so the ones
   * `quasar.config.js` lists never run on their own; nor do the ones app
   * extensions contribute, which is why an extension's components are otherwise
   * missing with no error. Import them and pass them here.
   */
  boot?: BootFile[]
}

export function setupQuasar(options: SetupQuasarOptions = {}) {
  return ({ app }: { app: App }) => {
    app.use(Quasar, options.quasar ?? {})
    for (const boot of options.boot ?? []) {
      boot({ app })
    }
  }
}
