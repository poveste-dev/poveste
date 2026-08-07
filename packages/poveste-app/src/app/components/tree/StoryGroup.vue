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
    class="poveste-story-group my-2 first:mt-0 last:mb-0 group"
  >
    <template v-if="group.title">
      <div class="h-[1px] bg-gray-500/10 mx-6 mb-2 group-first:hidden" />
      <div
        role="button"
        tabindex="0"
        class="px-0.5 py-2 md:py-1.5 mx-1 rounded-sm hover:bg-primary-100 dark:hover:bg-primary-900 cursor-pointer select-none flex items-center gap-2 min-w-0 opacity-50 hover:opacity-100"
        @click="toggleOpen"
        @keyup.enter="toggleOpen"
        @keyup.space="toggleOpen"
      >
        <Icon
          :icon="isFolderOpen ? 'ri:subtract-line' : 'ri:add-line'"
          class="w-4 h-4 ml-4 rounded-sm border border-gray-500/40"
        />
        <span class="truncate">{{ group.title }}</span>
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
