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
    const pluginModule = await clientPlugin()
    mountComponent.value = markRaw(pluginModule.MountStory)
  }
})
</script>

<template>
  <component
    :is="mountComponent"
    v-if="mountComponent"
    class="poveste-generic-mount-story histoire-generic-mount-story"
    :story="story"
    v-bind="$attrs"
  />
</template>
