<script lang="ts" setup>
import type { Story } from '../../types'
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollOnActive } from '../../util/scroll'
import BaseListItemLink from '../base/BaseListItemLink.vue'

const props = withDefaults(defineProps<{
  story: Story
  depth?: number
}>(), {
  depth: 0,
})

const filePadding = computed(() => {
  return `${props.depth * 12}px`
})

const route = useRoute()
const isActive = computed(() => route.params.storyId === props.story.id)
const el = ref<HTMLDivElement>()
useScrollOnActive(isActive, el)
</script>

<template>
  <div
    ref="el"
    data-test-id="story-list-item"
    class="poveste-story-list-item"
  >
    <BaseListItemLink
      v-slot="{ active }"
      :to="{
        name: 'story',
        params: {
          storyId: story.id,
        },
      }"
      class="ptw-pl-0.5 ptw-pr-2 ptw-py-2 md:ptw-py-1.5 ptw-mx-1 ptw-rounded-sm"
    >
      <span class="bind-tree-margin ptw-flex ptw-items-center ptw-gap-2 ptw-pl-4 ptw-min-w-0">
        <Icon
          :icon="story.icon ?? 'carbon:cube'"
          class="ptw-w-5 ptw-h-5 sm:ptw-w-4 sm:ptw-h-4 ptw-flex-none"
          :class="{
            'ptw-text-primary-500': !active && !story.iconColor,
            'bind-icon-color': !active && story.iconColor,
          }"
        />
        <span class="ptw-truncate">{{ story.title }}</span>
      </span>

      <span
        v-if="!story.docsOnly"
        class="ptw-opacity-40 ptw-text-sm"
      >
        {{ story.variants.length }}
      </span>
    </BaseListItemLink>
  </div>
</template>

<style scoped>
.bind-tree-margin {
  margin-left: v-bind(filePadding);
}

.bind-icon-color {
  color: v-bind('story.iconColor');
}
</style>
