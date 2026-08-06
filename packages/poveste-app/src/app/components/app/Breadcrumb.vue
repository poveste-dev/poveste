<script lang="ts" setup>
import type { Story, Tree } from '../../types'
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useStoryStore } from '../../stores/story'
import StoryList from '../tree/StoryList.vue'
import MobileOverlay from './MobileOverlay.vue'

defineProps<{
  tree: Tree
  stories: Story[]
}>()

const storyStore = useStoryStore()

const story = computed(() => storyStore.currentStory)

const folders = computed(() => {
  return story.value.file.path.slice(0, -1)
})

const isMenuOpened = ref(false)

function openMenu() {
  isMenuOpened.value = true
}

function closeMenu() {
  isMenuOpened.value = false
}

watch(story, () => {
  isMenuOpened.value = false
})
</script>

<template>
  <div class="poveste-breadcrumb">
    <a
      class="ptw-px-6 ptw-h-12 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer ptw-flex ptw-gap-2 ptw-flex-wrap ptw-w-full ptw-items-center"
      @click="openMenu"
    >
      <template v-if="story">
        <template
          v-for="(file, key) of folders"
          :key="key"
        >
          <span>
            {{ file }}
          </span>
          <span class="ptw-opacity-40">
            /
          </span>
        </template>
        <span class="ptw-flex ptw-items-center ptw-gap-2">
          <Icon
            :icon="story.icon ?? 'carbon:cube'"
            class="ptw-w-5 ptw-h-5 ptw-flex-none"
            :class="{
              'ptw-text-primary-500': !story.iconColor,
              'bind-icon-color': story.iconColor,
            }"
          />
          {{ story.title }}
          <span class="ptw-opacity-40 ptw-text-sm">
            {{ story.variants.length }}
          </span>
        </span>
      </template>
      <template v-else>
        Select a story...
      </template>

      <Icon
        icon="carbon:chevron-sort"
        class="ptw-w-5 ptw-h-5 ptw-shrink-0 ptw-ml-auto"
      />
    </a>
  </div>

  <MobileOverlay
    title="Select a story"
    :opened="isMenuOpened"
    @close="closeMenu"
  >
    <StoryList
      :tree="tree"
      :stories="stories"
      class="ptw-flex-1 ptw-overflow-y-scroll"
    />
  </MobileOverlay>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('story?.iconColor');
}
</style>
