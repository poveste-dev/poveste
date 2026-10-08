/**
 * An SFC with `vapor` removed from its `<script>` and `<template>` tags, or
 * undefined when it has none. Only the opening tags: the attribute does nothing
 * anywhere else, and a template may well contain the word.
 */
export function withoutVapor(code: string): string | undefined {
  const stripped = code.replace(/<(?:script|template)\b[^>]*>/g, tag => tag.replace(/\svapor(?=[\s/>])/, ''))
  return stripped === code ? undefined : stripped
}

export const VAPOR_INTEROP_ID = 'virtual:$poveste-plugin-vue/vapor-interop'

/**
 * Whether a Vue of this version exports `vaporInteropPlugin`: 3.6 and later,
 * prereleases included. Only the project knows its Vue, so the story app gets
 * the plugin through `VAPOR_INTEROP_ID` rather than importing it: a named import
 * fails to link against 3.5, and reading it off the namespace either warns in
 * every 3.5 build or keeps all of Vue in the bundle (#1112).
 */
export function hasVaporInterop(version: string | undefined): boolean {
  const match = /^(\d+)\.(\d+)\./.exec(version ?? '')
  if (!match) {
    return false
  }
  const [major, minor] = [Number(match[1]), Number(match[2])]
  return major > 3 || (major === 3 && minor >= 6)
}

export function vaporInteropModule(vueVersion: string | undefined): string {
  return hasVaporInterop(vueVersion)
    ? `export { vaporInteropPlugin as default } from 'vue'\n`
    : `export default undefined\n`
}
