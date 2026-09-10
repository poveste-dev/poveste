<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type { Story } from '../../types'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'
import { markRaw, ref, watchEffect } from 'vue'

const props = defineProps<{
  story: Story
}>()

const mountComponent = ref(null)

watchEffect(async () => {
  const supportPluginId = props.story.file?.supportPluginId
  const clientPlugin = supportPluginId ? clientSupportPlugins[supportPluginId] : undefined
  if (clientPlugin) {
    try {
      const pluginModule = await clientPlugin()
      mountComponent.value = markRaw(pluginModule.RenderStory)
    }
    catch (e) {
      console.error(e)
      throw e
    }
  }
})
</script>

<template>
  <component
    :is="mountComponent"
    v-if="mountComponent"
    class="poveste-generic-render-story __poveste-render-story histoire-generic-render-story __histoire-render-story"
    :story="story"
    v-bind="$attrs"
  />
</template>
