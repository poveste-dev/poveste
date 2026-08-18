<script lang="ts" setup>
import type { Story, TreeFolder, TreeLeaf } from '../../types'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useFolderStore } from '../../stores/folder'
import StoryListItem from './StoryListItem.vue'

const props = withDefaults(defineProps<{
  path?: Array<string>
  folder: TreeFolder
  stories: Story[]
  depth?: number
}>(), {
  depth: 0,
  path: () => [],
})

const folderStore = useFolderStore()

const folderPath = computed(() => [...props.path, props.folder.title])
const isFolderOpen = computed(() => folderStore.isFolderOpened(folderPath.value))

function toggleOpen() {
  folderStore.toggleFolder(folderPath.value)
}

const folderPadding = computed(() => {
  return `${props.depth * 12}px`
})
</script>

<template>
  <div
    data-testid="story-list-folder"
    class="poveste-story-list-folder"
  >
    <div
      role="button"
      tabindex="0"
      class="poveste-story-list-folder-button px-0.5 py-2 md:py-1.5 mx-1 rounded-sm hover:bg-primary-100 dark:hover:bg-primary-900 cursor-pointer select-none flex"
      @click="toggleOpen"
      @keyup.enter="toggleOpen"
      @keyup.space="toggleOpen"
    >
      <span class="bind-tree-padding flex items-center gap-2 min-w-0">
        <span class="flex flex-none items-center opacity-30 [.poveste-story-list-folder-button:hover_&]:opacity-100 ml-4 w-4 h-4 rounded-sm border border-gray-500/40">
          <Icon
            icon="carbon:caret-right"
            class="w-full h-full transition-transform duration-150"
            :class="{
              'rotate-90': isFolderOpen,
            }"
          />
        </span>
        <span class="truncate">{{ folder.title }}</span>
      </span>
    </div>

    <!-- Children -->
    <div
      v-if="isFolderOpen"
    >
      <template
        v-for="element of folder.children"
        :key="element.title"
      >
        <StoryListFolder
          v-if="(element as TreeFolder).children"
          :path="folderPath"
          :folder="(element as TreeFolder)"
          :stories="stories"
          :depth="depth + 1"
        />
        <StoryListItem
          v-else
          :story="stories[(element as TreeLeaf).index]"
          :depth="depth + 1"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.bind-tree-padding {
  padding-left: v-bind(folderPadding);
}
</style>
