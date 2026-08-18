<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { useStoryStore } from '../../stores/story'

import BaseEmpty from '../base/BaseEmpty.vue'
import BaseSplitPane from '../base/BaseSplitPane.vue'
import PaneTabs from './PaneTabs.vue'
import StoryControls from './StoryControls.vue'
import StoryDocs from './StoryDocs.vue'
import StoryEvents from './StoryEvents.vue'
import StorySourceCode from './StorySourceCode.vue'

const storyStore = useStoryStore()
const layoutStore = useLayoutStore()

const innerOrientation = computed(() =>
  layoutStore.settings.storyOptionsPlacement === 'bottom' ? 'landscape' : 'portrait',
)

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
  <div class="h-full w-full p-2">
    <div class="h-full w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-700">
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
        :save-id="`story-sidepane-${innerOrientation}`"
        :orientation="innerOrientation"
        class="poveste-story-side-panel poveste-loaded h-full"
        data-testid="story-side-panel"
      >
        <template #first>
          <div class="flex flex-col h-full">
            <PaneTabs
              :story="storyStore.currentStory"
              :variant="storyStore.currentVariant"
            />

            <component
              :is="panelContentComponent"
              :story="storyStore.currentStory"
              :variant="storyStore.currentVariant"
              class="h-full overflow-auto"
            />
          </div>
        </template>

        <template #last>
          <StorySourceCode
            :story="storyStore.currentStory"
            :variant="storyStore.currentVariant"
            class="h-full"
          />
        </template>
      </BaseSplitPane>
    </div>
  </div>
</template>
