/**
 * The names a Vue setup file may export, most established first.
 *
 * `setupVue3` is what users have written in `poveste.setup.ts` since histoire,
 * so it can never be removed without a major. `setupVue` is the unnumbered name
 * new docs use — added as an alias rather than a rename, which is the only way
 * to introduce it without breaking every existing setup file (#135).
 *
 * Order is load-bearing: `getSetupHook` runs the first one present, so a file
 * that already exports `setupVue3` behaves exactly as before.
 */
export const VUE_SETUP_HOOK_NAMES = ['setupVue3', 'setupVue']
