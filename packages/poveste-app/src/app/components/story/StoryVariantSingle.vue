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
    class="poveste-story-variant-single p-2 h-full __poveste-pane-shadow-from-right"
  >
    <StoryVariantSingleView
      :variant="variant"
      :story="storyStore.currentStory"
    />
  </div>
  <template v-else>
    <div
      v-if="isMobile"
      class="divide-y divide-gray-100 dark:divide-gray-800 h-full flex flex-col"
    >
      <a
        class="px-6 h-12 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer flex gap-2 flex-wrap w-full items-center flex-none"
        @click="$emit('openVariantMenu')"
      >
        <template v-if="variant">
          <Icon
            :icon="variant.icon ?? 'carbon:cube'"
            class="w-5 h-5 flex-none"
            :class="{
              'text-gray-500': !variant.iconColor,
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
          class="w-5 h-5 shrink-0 ml-auto"
        />
      </a>
      <div
        v-if="storyStore.currentVariant"
        class="p-2 h-full"
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
        <div class="h-full overflow-y-auto">
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
          class="p-2 h-full __poveste-pane-shadow-from-right"
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
