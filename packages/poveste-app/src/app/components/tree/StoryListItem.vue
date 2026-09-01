<script lang="ts" setup>
import type { Story } from '../../types'
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStoryErrorStore } from '../../stores/story-errors'
import { useScrollOnActive } from '../../util/scroll'
import BaseListItemLink from '../base/BaseListItemLink.vue'

const props = withDefaults(defineProps<{
  story: Story
  depth?: number
}>(), {
  depth: 0,
})

// Only ever means "a variant of this story was seen to throw". A variant that
// has not rendered cannot have reported, so no marker is not a clean bill of
// health — see the store, and the open half of #323.
const errorStore = useStoryErrorStore()
const hasError = computed(() => errorStore.storyHasError(props.story.id))

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
    data-testid="story-list-item"
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
      class="pl-0.5 pr-2 py-2 md:py-1.5 mx-1 rounded-sm"
    >
      <span class="bind-tree-margin flex items-center gap-2 pl-4 min-w-0">
        <Icon
          :icon="story.icon ?? 'carbon:cube'"
          class="w-5 h-5 sm:w-4 sm:h-4 flex-none"
          :class="{
            'text-primary-500': !active && !story.iconColor,
            'bind-icon-color': !active && story.iconColor,
          }"
        />
        <span class="truncate">{{ story.title }}</span>
      </span>

      <Icon
        v-if="hasError"
        icon="carbon:warning-alt"
        class="w-4 h-4 flex-none ml-auto text-red-500"
        data-testid="story-error-marker"
        aria-label="A variant of this story threw while rendering"
      />

      <span
        v-if="!story.docsOnly"
        class="opacity-40 text-sm"
        :aria-label="`${story.variants.length} ${story.variants.length === 1 ? 'variant' : 'variants'}`"
        role="note"
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
