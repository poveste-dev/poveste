// @percy/sdk-utils ships no types. Only what this plugin calls is declared.
declare module '@percy/sdk-utils' {
  export function isPercyEnabled(): Promise<boolean>
  export function fetchPercyDOM(): Promise<string>
  export function postSnapshot(options: Record<string, unknown>): Promise<unknown>
}
