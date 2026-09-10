import type { Story, Variant } from '../types'
import { unindent } from '@poveste/shared'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'

export async function getSourceCode(story: Story, variant: Variant) {
  if (variant.source) {
    return variant.source
  }
  else if (variant.slots?.().source) {
    const source = variant.slots?.().source()[0].children
    if (source) {
      return unindent(source)
    }
  }
  else {
    const supportPluginId = story.file?.supportPluginId
    const clientPlugin = supportPluginId ? clientSupportPlugins[supportPluginId] : undefined
    if (clientPlugin) {
      const pluginModule = await clientPlugin()
      return pluginModule.generateSourceCode(variant)
    }
  }

  const sourceLoader = story.file?.source
  if (sourceLoader) {
    return (await sourceLoader()).default
  }
}
