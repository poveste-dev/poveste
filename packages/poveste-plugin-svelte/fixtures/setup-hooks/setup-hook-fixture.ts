// Stands in for both of the setup file's virtual modules (see `vitest.config.ts`).
export const hook: { current?: ((api: any) => unknown) | undefined } = {}

export function setupSvelte(api: any) {
  return hook.current?.(api)
}
