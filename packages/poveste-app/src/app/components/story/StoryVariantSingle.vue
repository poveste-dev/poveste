<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useStoryStore } from '../../stores/story'
import { isMobile } from '../../util/responsive'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import StoryVariantListItem from './StoryVariantListItem.vue'
import StoryVariantSingleView from './StoryVariantSingleView.vue'

defineEmits({
  openVariantMenu: () => true,
})

const storyStore = useStoryStore()

const hasSingleVariant = computed(() => (storyStore.currentStory?.variants.length === 1))

const variant = computed(() => storyStore.currentVariant)
</script>

<template>
  <div
    v-if="hasSingleVariant && variant"
    class="poveste-story-variant-single ptw-p-2 ptw-h-full __poveste-pane-shadow-from-right"
  >
    <StoryVariantSingleView
      :variant="variant"
      :story="storyStore.currentStory"
    />
  </div>
  <template v-else>
    <div
      v-if="isMobile"
      class="ptw-divide-y ptw-divide-gray-100 dark:ptw-divide-gray-800 ptw-h-full ptw-flex ptw-flex-col"
    >
      <a
        class="ptw-px-6 ptw-h-12 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer ptw-flex ptw-gap-2 ptw-flex-wrap ptw-w-full ptw-items-center ptw-flex-none"
        @click="$emit('openVariantMenu')"
      >
        <template v-if="variant">
          <Icon
            :icon="variant.icon ?? 'carbon:cube'"
            class="ptw-w-5 ptw-h-5 ptw-flex-none"
            :class="{
              'ptw-text-gray-500': !variant.iconColor,
              'bind-icon-color': variant.iconColor,
            }"
          />
          {{ variant.title }}
        </template>
        <template v-else>
          Select a variant...
        </template>

        <Icon
          icon="carbon:chevron-sort"
          class="ptw-w-5 ptw-h-5 ptw-shrink-0 ptw-ml-auto"
        />
      </a>
      <div
        v-if="storyStore.currentVariant"
        class="ptw-p-2 ptw-h-full"
      >
        <StoryVariantSingleView
          :variant="storyStore.currentVariant"
          :story="storyStore.currentStory"
        />
      </div>
    </div>
    <BaseSplitPane
      v-else
      save-id="story-single-main-split"
      :min="5"
      :max="40"
      :default-split="17"
    >
      <template #first>
        <div class="ptw-h-full ptw-overflow-y-auto">
          <StoryVariantListItem
            v-for="(v, index) of storyStore.currentStory.variants"
            :key="index"
            :variant="v"
          />
        </div>
      </template>
      <template #last>
        <div
          v-if="storyStore.currentVariant"
          class="ptw-p-2 ptw-h-full __poveste-pane-shadow-from-right"
        >
          <StoryVariantSingleView
            :variant="storyStore.currentVariant"
            :story="storyStore.currentStory"
          />
        </div>
      </template>
    </BaseSplitPane>
  </template>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('variant?.iconColor');
}
</style>
