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
      class="px-6 h-12 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer flex gap-2 flex-wrap w-full items-center"
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
          <span class="opacity-40">
            /
          </span>
        </template>
        <span class="flex items-center gap-2">
          <Icon
            :icon="story.icon ?? 'carbon:cube'"
            class="w-5 h-5 flex-none"
            :class="{
              'text-primary-500': !story.iconColor,
              'bind-icon-color': story.iconColor,
            }"
          />
          {{ story.title }}
          <span class="opacity-40 text-sm">
            {{ story.variants.length }}
          </span>
        </span>
      </template>
      <template v-else>
        Select a story...
      </template>

      <Icon
        icon="carbon:chevron-sort"
        class="w-5 h-5 shrink-0 ml-auto"
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
      class="flex-1 overflow-y-scroll"
    />
  </MobileOverlay>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('story?.iconColor');
}
</style>
