<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { useStoryStore } from '../../stores/story'
import { isMobile } from '../../util/responsive'

import { autoSelectsVariant } from '../../util/variant'
import BaseEmpty from '../base/BaseEmpty.vue'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import StoryDocs from '../panel/StoryDocs.vue'
import StorySidePanel from '../panel/StorySidePanel.vue'
import StoryViewer from './StoryViewer.vue'

const storyStore = useStoryStore()
const layoutStore = useLayoutStore()

// Coerced: a settings object stored before a key existed leaves it `undefined`,
// which the pane's Boolean prop would read as its `true` default — the inverse
// of what the branch this replaced did with the same value (#596).
const effectiveStoryOptionsVisible = computed(() =>
  !!(storyStore.currentStory?.meta?.storyOptions ?? layoutStore.settings.storyOptionsVisible),
)

const placement = computed(() => layoutStore.settings.storyOptionsPlacement)
const splitOrientation = computed(() => placement.value === 'bottom' ? 'portrait' : 'landscape')
const splitDefaultSplit = computed(() => placement.value === 'bottom' ? 60 : 75)

const router = useRouter()
const route = useRoute()

// Restore variant selection

watch(() => storyStore.currentVariant, (value) => {
  if (value) {
    storyStore.currentStory.lastSelectedVariant = value
  }
}, {
  immediate: true,
})

watch(() => [storyStore.currentStory, storyStore.currentVariant], () => {
  if (!storyStore.currentVariant && autoSelectsVariant(storyStore.currentStory)) {
    const variant = storyStore.currentStory.lastSelectedVariant ?? storyStore.currentStory.variants[0]
    setVariant(variant.id)
  }
}, {
  immediate: true,
})

function setVariant(variantId: string) {
  router.replace({
    ...route,
    query: {
      ...route.query,
      variantId,
    },
  })
}

// Docs auto-scroll to top

const docsOnlyScroller = ref<HTMLElement>(null)

function scrollDocsToTop() {
  docsOnlyScroller.value?.scrollTo(0, 0)
}
</script>

<template>
  <BaseEmpty
    v-if="!storyStore.currentStory"
    class="poveste-story-view poveste-no-story"
  >
    <Icon
      icon="carbon:software-resource-resource"
      class="w-16 h-16 opacity-50"
    />
  </BaseEmpty>

  <div
    v-else
    class="poveste-story-view poveste-with-story h-full"
  >
    <div
      v-if="storyStore.currentStory.docsOnly"
      ref="docsOnlyScroller"
      class="h-full overflow-auto"
    >
      <StoryDocs
        :story="storyStore.currentStory"
        standalone
        class="md:p-12 w-full md:max-w-[600px] lg:max-w-[800px] xl:max-w-[900px]"
        @scroll-top="scrollDocsToTop()"
      />
    </div>
    <!--
      One split pane whether or not the options pane is showing, and whether or
      not the viewport is mobile — both used to render `StoryViewer` from a
      different branch, which moved it in the tree and cold-booted the sandbox
      under it. `isMobile` is a live media query, so that one fired on a resize
      (#596).
    -->
    <BaseSplitPane
      v-else
      :save-id="`story-main-${placement}`"
      :orientation="splitOrientation"
      :min="30"
      :max="95"
      :default-split="splitDefaultSplit"
      :show-divider="false"
      :show-last="!isMobile && effectiveStoryOptionsVisible"
      class="h-full"
    >
      <template #first>
        <StoryViewer />
      </template>

      <template #last>
        <StorySidePanel />
      </template>
    </BaseSplitPane>
  </div>
</template>
