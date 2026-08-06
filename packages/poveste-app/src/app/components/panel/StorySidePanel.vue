<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStoryStore } from '../../stores/story'

import BaseEmpty from '../base/BaseEmpty.vue'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import PaneTabs from './PaneTabs.vue'
import StoryControls from './StoryControls.vue'
import StoryDocs from './StoryDocs.vue'
import StoryEvents from './StoryEvents.vue'
import StorySourceCode from './StorySourceCode.vue'

const storyStore = useStoryStore()

const route = useRoute()

const panelContentComponent = computed(() => {
  switch (route.query.tab) {
    case 'docs':
      return StoryDocs
    case 'events':
      return StoryEvents
    default:
      return StoryControls
  }
})
</script>

<template>
  <BaseEmpty
    v-if="!storyStore.currentVariant"
    class="poveste-story-side-panel poveste-selection"
  >
    <span>Select a variant</span>
  </BaseEmpty>

  <BaseEmpty
    v-else-if="!storyStore.currentVariant.configReady || !storyStore.currentVariant.previewReady"
    class="poveste-story-side-panel poveste-loading"
  >
    <span>Loading...</span>
  </BaseEmpty>

  <BaseSplitPane
    v-else
    save-id="story-sidepane"
    orientation="portrait"
    class="poveste-story-side-panel poveste-loaded ptw-h-full"
    data-test-id="story-side-panel"
  >
    <template #first>
      <div class="ptw-flex ptw-flex-col ptw-h-full">
        <PaneTabs
          :story="storyStore.currentStory"
          :variant="storyStore.currentVariant"
        />

        <component
          :is="panelContentComponent"
          :story="storyStore.currentStory"
          :variant="storyStore.currentVariant"
          class="ptw-h-full ptw-overflow-auto"
        />
      </div>
    </template>

    <template #last>
      <StorySourceCode
        :story="storyStore.currentStory"
        :variant="storyStore.currentVariant"
        class="ptw-h-full"
      />
    </template>
  </BaseSplitPane>
</template>
