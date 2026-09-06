<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useStoryStore } from '../../stores/story'
import { isMobile } from '../../util/responsive'
import { autoSelectsVariant } from '../../util/variant'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import StoryVariantListItem from './StoryVariantListItem.vue'
import StoryVariantSingleView from './StoryVariantSingleView.vue'

defineEmits({
  openVariantMenu: () => true,
})

const storyStore = useStoryStore()

const hasSingleVariant = computed(() => (storyStore.currentStory?.variants.length === 1))

const variant = computed(() => storyStore.currentVariant ?? null)

// The preview area exists while a variant is showing or on its way. Dropping it
// the moment the variant goes null would unmount the preview across the two-step
// route change, which is the whole thing #328 is about; keeping it when no
// variant is coming leaves an empty box and, on mobile, a divider under the
// picker. Same predicate the view below releases its held pair on.
const showsPreview = computed(() => !!variant.value || autoSelectsVariant(storyStore.currentStory))
</script>

<template>
  <div
    v-if="isMobile"
    class="divide-y divide-gray-100 dark:divide-gray-800 h-full flex flex-col"
  >
    <a
      v-if="!hasSingleVariant || !variant"
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
      v-if="showsPreview"
      class="poveste-story-variant-single p-2 h-full __poveste-pane-shadow-from-right"
    >
      <StoryVariantSingleView
        :variant="variant"
        :story="storyStore.currentStory"
      />
    </div>
  </div>

  <!--
    One split pane whether or not there is a list to put in it. A story with a
    single variant hides the first pane instead of taking a different branch, so
    the preview stays at one position in the tree and survives the move between
    a one-variant story and a many-variant one (#328).
  -->
  <BaseSplitPane
    v-else
    save-id="story-single-main-split"
    :min="5"
    :max="40"
    :default-split="17"
    :show-first="!hasSingleVariant"
  >
    <template #first>
      <div class="h-full overflow-y-auto">
        <StoryVariantListItem
          v-for="(v, index) of storyStore.currentStory?.variants ?? []"
          :key="index"
          :variant="v"
        />
      </div>
    </template>
    <template #last>
      <div
        v-if="showsPreview"
        class="poveste-story-variant-single p-2 h-full __poveste-pane-shadow-from-right"
      >
        <StoryVariantSingleView
          :variant="variant"
          :story="storyStore.currentStory"
        />
      </div>
    </template>
  </BaseSplitPane>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('variant?.iconColor');
}
</style>
