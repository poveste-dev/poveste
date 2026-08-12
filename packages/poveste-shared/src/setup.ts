export type SetupModule = Record<string, unknown> | undefined

/**
 * Reads a setup hook (`setupVanilla`, `setupVue3`, ...) out of a setup module.
 *
 * Takes the module as an argument instead of letting callers access it inline:
 * the setup modules are namespace imports of virtual or user-provided files that
 * aren't guaranteed to declare every hook, and a static `namespace.setupVue3`
 * access makes Rollup warn `"setupVue3" is not exported by ...` in every
 * consumer build. Passing the namespace through a call forces it to be
 * materialized, so the lookup happens at runtime where it belongs.
 */
export function getSetupHook<T>(mod: SetupModule, name: string | string[]): T | undefined {
  const names = typeof name === 'string' ? [name] : name
  const present = names.filter(candidate => typeof mod?.[candidate] === 'function')

  // Earlier names win, so a plugin lists its established hook first and a newer
  // alias after it: an existing setup file keeps the exact behaviour it had.
  // Running both instead would apply the same setup twice, which for Vue means
  // a second `app.use()` for every plugin the user registers.
  if (present.length > 1) {
    console.warn(
      `[poveste] Setup file exports ${present.length} interchangeable setup hooks (${present.join(', ')}). `
      + `Only ${present[0]} runs. Keep one — they are aliases, not separate hooks.`,
    )
  }

  return present.length > 0 ? mod![present[0]] as T : undefined
}
