export type SetupModule = Record<string, unknown> | undefined

/**
 * Reads a setup hook (`setupVanilla`, `setupVue3`, ...) out of a setup module.
 *
 * `retired` names hooks a plugin has stopped accepting. Nothing passes a
 * non-empty list today; it exists so that removing a name at 1.0 is a string
 * moving between two arrays rather than a failure mode designed under release
 * pressure.
 *
 * Takes the module as an argument instead of letting callers access it inline:
 * the setup modules are namespace imports of virtual or user-provided files that
 * aren't guaranteed to declare every hook, and a static `namespace.setupVue3`
 * access makes Rollup warn `"setupVue3" is not exported by ...` in every
 * consumer build. Passing the namespace through a call forces it to be
 * materialized, so the lookup happens at runtime where it belongs.
 */
export function getSetupHook<T>(mod: SetupModule, name: string | string[], retired: string[] = []): T | undefined {
  const names = typeof name === 'string' ? [name] : name
  const present = names.filter(candidate => typeof mod?.[candidate] === 'function')

  // Dropping a name is otherwise silent: the export stops being looked up, and a
  // file that has it does nothing at all — no error, no warning, no hook. The
  // people most likely to hold one are working from an older recipe, which is
  // the worst audience for a silent failure.
  //
  // `retired` is a parameter rather than a constant so the mechanism can be
  // exercised with a fixture list while every production list is still empty.
  // An empty detector that has only ever been seen to pass cannot be told apart
  // from one that does not work (#157).
  const dropped = retired.filter(candidate => typeof mod?.[candidate] === 'function')
  if (dropped.length > 0) {
    console.warn(
      `[poveste] Setup file exports ${dropped.join(', ')}, which ${dropped.length === 1 ? 'is' : 'are'} no longer read. `
      + `Rename to ${names[names.length - 1]} — nothing runs until you do.`,
    )
  }

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
