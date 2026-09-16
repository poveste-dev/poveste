/**
 * The names a Svelte setup file may export, most established first.
 *
 * The numbers are historical. `@poveste/plugin-svelte` supports Svelte 5 only,
 * so `setupSvelte3` and `setupSvelte4` name majors it cannot run — they are
 * accepted because histoire users wrote them, not because they select anything.
 * `setupSvelte` is the unnumbered name, added as an alias rather than a rename,
 * which is the only way to introduce it without breaking every existing setup
 * file (#157).
 *
 * Order is load-bearing: `getSetupHook` runs the first one present, so a file
 * that already exports `setupSvelte5` behaves exactly as before and the new name
 * is the one that yields.
 */
export const SVELTE_SETUP_HOOK_NAMES = ['setupSvelte3', 'setupSvelte4', 'setupSvelte5', 'setupSvelte']

/**
 * Names this plugin has stopped reading.
 *
 * Empty, and meant to stay empty until 1.0 retires the numbered names. It is
 * here so that doing so is a string moving from the list above to this one,
 * with the warning already written and already tested.
 */
export const SVELTE_RETIRED_SETUP_HOOK_NAMES: string[] = []
