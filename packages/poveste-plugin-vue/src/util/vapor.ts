import type { Plugin } from 'vite'

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

/**
 * Collection imports every story file in Node, where Vue 3.6's entry has no
 * Vapor runtime, so a `<script setup vapor>` component failed with "does not
 * provide an export named 'defineVaporComponent'" and took its whole story out
 * of the book (#1153). Collection only reads metadata and stubs every component
 * but `Story` and `Variant`, so the component is compiled as an ordinary one
 * there. The browser still gets it as Vapor.
 *
 * A story file is compiled without it in the browser too. Under a Vapor parent,
 * `Story` and `Variant` get Vapor blocks for slots rather than vnodes, and the
 * preview never left "Loading..." (#1164). The components it imports stay Vapor.
 */
export function withoutVaporPlugin(): Plugin {
  let isStoryFile: (id: string) => boolean = () => false
  return {
    name: 'poveste-plugin-vue:without-vapor',
    enforce: 'pre',
    configResolved(config) {
      const api = config.plugins.find(plugin => plugin.name === 'poveste-vite-plugin')?.api
      isStoryFile = api?.isStoryFile ?? isStoryFile
    },
    transform(code, id) {
      if (!id.endsWith('.vue') || !((this.meta as any).poveste?.isCollecting || isStoryFile(id))) {
        return undefined
      }
      return withoutVapor(code)
    },
  }
}
