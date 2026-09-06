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
  <!--
    One split pane for every layout. The variant list, the mobile picker row and
    the bare single-variant view used to be three branches each carrying their
    own `StoryVariantSingleView`, so moving between them rebuilt the preview and
    cold-booted its sandbox. `isMobile` is a live media query, so that happened
    on a window resize (#600); the single/many-variant half was #328.
  -->
  <BaseSplitPane
    save-id="story-single-main-split"
    :min="5"
    :max="40"
    :default-split="17"
    :show-first="!isMobile && !hasSingleVariant"
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
        class="h-full flex flex-col"
        :class="{ 'divide-y divide-gray-100 dark:divide-gray-800': isMobile }"
      >
        <!-- Mobile has no room for the list beside the preview, so the variant
             it is showing opens a full-screen overlay instead. -->
        <a
          v-if="isMobile && (!hasSingleVariant || !variant)"
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
    </template>
  </BaseSplitPane>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('variant?.iconColor');
}
</style>
