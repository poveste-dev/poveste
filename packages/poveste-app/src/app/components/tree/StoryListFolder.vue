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
    data-test-id="story-list-folder"
    class="poveste-story-list-folder"
  >
    <div
      role="button"
      tabindex="0"
      class="poveste-story-list-folder-button ptw-px-0.5 ptw-py-2 md:ptw-py-1.5 ptw-mx-1 ptw-rounded-sm hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-900 ptw-cursor-pointer ptw-select-none ptw-flex"
      @click="toggleOpen"
      @keyup.enter="toggleOpen"
      @keyup.space="toggleOpen"
    >
      <span class="bind-tree-padding ptw-flex ptw-items-center ptw-gap-2 ptw-min-w-0">
        <span class="ptw-flex ptw-flex-none ptw-items-center ptw-opacity-30 [.poveste-story-list-folder-button:hover_&]:ptw-opacity-100 ptw-ml-4 ptw-w-4 ptw-h-4 ptw-rounded-sm ptw-border ptw-border-gray-500/40">
          <Icon
            icon="carbon:caret-right"
            class="ptw-w-full ptw-h-full ptw-transition-transform ptw-duration-150"
            :class="{
              'ptw-rotate-90': isFolderOpen,
            }"
          />
        </span>
        <span class="ptw-truncate">{{ folder.title }}</span>
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
