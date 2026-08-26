// Wrap a resolved Nuxt client plugin so a throw while it sets up in the headless
// story sandbox is logged and skipped, instead of aborting the rest of the boot
// and painting an error into the iframe (#277). Nuxt's `applyPlugins` stops at
// the first plugin that throws, so without this one sandbox-hostile module takes
// down every plugin after it. Metadata (`_name`, `order`, `dependsOn`, ...) is
// copied over so ordering and dependency resolution are unchanged.
//
// This catches setup-time failures only. A plugin that throws at module import
// fails before this runs — drop those with HstNuxt({ excludePlugins }).
export function __povesteTolerant(plugin) {
  if (typeof plugin !== 'function') {
    return plugin
  }
  const wrapped = async (nuxtApp) => {
    try {
      return await plugin(nuxtApp)
    }
    catch (error) {
      console.warn(
        `[poveste] Nuxt client plugin ${plugin._name ?? plugin.name ?? '(anonymous)'} `
        + 'threw while setting up in the story sandbox; skipping it. Drop it with '
        + 'HstNuxt({ excludePlugins }) if it can never run headless.',
        error,
      )
    }
  }
  return Object.assign(wrapped, plugin)
}
