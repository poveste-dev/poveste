// Wrap a resolved Nuxt client plugin so a throw while it sets up in the headless
// story sandbox is logged and skipped, instead of aborting the rest of the boot
// and painting an error into the iframe (#277). Nuxt's `applyPlugins` stops at
// the first plugin that throws, so without this one sandbox-hostile module takes
// down every plugin after it. Metadata (`_name`, `order`, `dependsOn`, ...) is
// copied over so ordering and dependency resolution are unchanged.
//
// This catches setup-time failures only. A plugin that throws at module import
// fails before this runs — drop those with HstNuxt({ excludePlugins }).
//
// `src` is the path the plugin was imported from. `defineNuxtPlugin(() => {})`,
// the form Nuxt's docs teach first, has no name: a function's `.name` is then
// `''`, which `??` does not fall through, and the warning named nothing. Two of
// them printed the same line twice (#1063). The path is also what
// `excludePlugins` matches, so it is what the reader needs for the remedy.
export function __povesteTolerant(plugin, src) {
  if (typeof plugin !== 'function') {
    return plugin
  }
  const wrapped = async (nuxtApp) => {
    try {
      return await plugin(nuxtApp)
    }
    catch (error) {
      console.warn(
        `[poveste] Nuxt client plugin ${plugin._name || plugin.name || (src ? `from ${src}` : '(anonymous)')} `
        + 'threw while setting up in the story sandbox; skipping it. Drop it with '
        + 'HstNuxt({ excludePlugins }) if it can never run headless.',
        error,
      )
    }
  }
  return Object.assign(wrapped, plugin)
}
