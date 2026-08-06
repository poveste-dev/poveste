<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStoryStore } from '../../stores/story'

import { isMobile } from '../../util/responsive'
import BaseEmpty from '../base/BaseEmpty.vue'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import StoryDocs from '../panel/StoryDocs.vue'
import StorySidePanel from '../panel/StorySidePanel.vue'
import StoryViewer from './StoryViewer.vue'

const storyStore = useStoryStore()

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
  if (!storyStore.currentVariant) {
    if (storyStore.currentStory?.lastSelectedVariant) {
      setVariant(storyStore.currentStory.lastSelectedVariant.id)
      return
    }

    if (storyStore.currentStory?.variants.length === 1) {
      setVariant(storyStore.currentStory.variants[0].id)
    }
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
      class="ptw-w-16 ptw-h-16 ptw-opacity-50"
    />
  </BaseEmpty>

  <div
    v-else
    class="poveste-story-view poveste-with-story ptw-h-full"
  >
    <div
      v-if="storyStore.currentStory.docsOnly"
      ref="docsOnlyScroller"
      class="ptw-h-full ptw-overflow-auto"
    >
      <StoryDocs
        :story="storyStore.currentStory"
        standalone
        class="md:ptw-p-12 ptw-w-full md:ptw-max-w-[600px] lg:ptw-max-w-[800px] xl:ptw-max-w-[900px]"
        @scroll-top="scrollDocsToTop()"
      />
    </div>
    <template v-else-if="isMobile">
      <StoryViewer />
    </template>
    <BaseSplitPane
      v-else
      save-id="story-main"
      :min="30"
      :max="95"
      :default-split="75"
      class="ptw-h-full"
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
