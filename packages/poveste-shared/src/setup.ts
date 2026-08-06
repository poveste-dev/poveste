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
export function getSetupHook<T>(mod: SetupModule, name: string): T | undefined {
  const hook = mod?.[name]
  return typeof hook === 'function' ? hook as T : undefined
}
