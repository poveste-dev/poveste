<script lang="ts" setup>
import type { Story, TreeGroup } from '../../types'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useFolderStore } from '../../stores/folder'
import StoryListFolder from './StoryListFolder.vue'
import StoryListItem from './StoryListItem.vue'

const props = withDefaults(defineProps<{
  path?: Array<string>
  group: TreeGroup
  stories: Story[]
}>(), {
  path: () => [],
})

const folderStore = useFolderStore()

const folderPath = computed(() => [...props.path, props.group.title])
const isFolderOpen = computed(() => folderStore.isFolderOpened(folderPath.value, true))

function toggleOpen() {
  folderStore.toggleFolder(folderPath.value, false)
}
</script>

<template>
  <div
    data-test-id="story-group"
    class="poveste-story-group ptw-my-2 first:ptw-mt-0 last:ptw-mb-0 ptw-group"
  >
    <template v-if="group.title">
      <div class="ptw-h-[1px] ptw-bg-gray-500/10 ptw-mx-6 ptw-mb-2 group-first:ptw-hidden" />
      <div
        role="button"
        tabindex="0"
        class="ptw-px-0.5 ptw-py-2 md:ptw-py-1.5 ptw-mx-1 ptw-rounded-sm hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-900 ptw-cursor-pointer ptw-select-none ptw-flex ptw-items-center ptw-gap-2 ptw-min-w-0 ptw-opacity-50 hover:ptw-opacity-100"
        @click="toggleOpen"
        @keyup.enter="toggleOpen"
        @keyup.space="toggleOpen"
      >
        <Icon
          :icon="isFolderOpen ? 'ri:subtract-line' : 'ri:add-line'"
          class="ptw-w-4 ptw-h-4 ptw-ml-4 ptw-rounded-sm ptw-border ptw-border-gray-500/40"
        />
        <span class="ptw-truncate">{{ group.title }}</span>
      </div>
    </template>

    <!-- Children -->
    <div
      v-if="isFolderOpen"
    >
      <template
        v-for="element of group.children"
        :key="element.title"
      >
        <StoryListFolder
          v-if="(element as TreeFolder).children"
          :path="folderPath"
          :folder="(element as TreeFolder)"
          :stories="stories"
          :depth="0"
        />
        <StoryListItem
          v-else
          :story="stories[(element as TreeLeaf).index]"
          :depth="0"
        />
      </template>
    </div>
  </div>
</template>
