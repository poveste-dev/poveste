<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type { Component } from 'vue'
import type { Story } from '../../types'
import { markRaw, ref, watchEffect } from 'vue'
import { loadClientPlugin } from '../../util/client-plugin.js'

const props = defineProps<{
  story: Story
}>()

const mountComponent = ref<Component | null>(null)

watchEffect(async () => {
  const pluginModule = await loadClientPlugin(props.story.file?.supportPluginId)
  if (pluginModule) {
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
