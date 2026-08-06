<script lang="ts" setup>
import { useStoryStore } from '../../stores/story'
import DevOnlyToolbarOpenInEditor from '../toolbar/DevOnlyToolbarOpenInEditor.vue'
import ToolbarBackground from '../toolbar/ToolbarBackground.vue'
import ToolbarNewTab from '../toolbar/ToolbarNewTab.vue'
import ToolbarResponsiveSize from '../toolbar/ToolbarResponsiveSize.vue'
import ToolbarTextDirection from '../toolbar/ToolbarTextDirection.vue'
import ToolbarTitle from '../toolbar/ToolbarTitle.vue'
import AppActions from './AppActions.vue'
import TopBarChip from './TopBarChip.vue'

defineEmits({
  search: () => true,
  layout: () => true,
})

const storyStore = useStoryStore()
</script>

<template>
  <div class="poveste-top-bar ptw-flex-none ptw-grid ptw-grid-cols-[1fr_auto_1fr] ptw-items-center ptw-h-14 ptw-px-4 ptw-gap-3">
    <AppActions
      class="ptw-justify-self-start"
      @layout="$emit('layout')"
      @search="$emit('search')"
    />

    <TopBarChip
      v-if="storyStore.currentStory || storyStore.currentVariant"
      class="ptw-px-6 ptw-py-1.5 ptw-max-w-full"
    >
      <ToolbarTitle
        :variant="storyStore.currentVariant ?? undefined"
        :story="storyStore.currentStory ?? undefined"
      />
    </TopBarChip>
    <span v-else />

    <TopBarChip
      v-if="storyStore.currentStory && !storyStore.currentStory.docsOnly"
      class="ptw-justify-self-end"
    >
      <ToolbarResponsiveSize
        v-if="storyStore.currentVariant && !storyStore.currentVariant.responsiveDisabled"
      />
      <ToolbarBackground />
      <ToolbarTextDirection />
      <ToolbarNewTab
        v-if="storyStore.currentVariant"
        :variant="storyStore.currentVariant"
        :story="storyStore.currentStory"
      />
      <DevOnlyToolbarOpenInEditor
        v-if="__POVESTE_DEV__"
        :file="storyStore.currentStory.file?.filePath"
        tooltip="Edit story in editor"
      />
    </TopBarChip>
  </div>
</template>
