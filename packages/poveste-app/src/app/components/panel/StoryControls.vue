<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import BaseEmpty from '../base/BaseEmpty.vue'
import GenericRenderStory from '../story/GenericRenderStory.vue'
import ControlsComponentProps from './ControlsComponentProps.vue'
import ControlsComponentState from './ControlsComponentState.vue'
import StatePresets from './StatePresets.vue'

const props = defineProps({
  variant: {
    type: Object as PropType<Variant>,
    required: true,
  },

  story: {
    type: Object as PropType<Story>,
    required: true,
  },
})

// Wait for controls render before applying presets
const ready = ref(false)

watch(() => props.variant, () => {
  ready.value = false
})

const hasCustomControls = computed(() => props.variant.slots().controls || props.story.slots().controls)

const hasInitState = computed(() => Object
  .entries(props.variant.state || {})
  .filter(([key]) => !key.startsWith('_h'))
  .length > 0)
</script>

<template>
  <div
    data-test-id="story-controls"
    class="poveste-story-controls ptw-flex ptw-flex-col ptw-divide-y ptw-divide-gray-100 dark:ptw-divide-gray-750"
  >
    <!-- Toolbar -->
    <div
      class="ptw-h-9 ptw-flex-none ptw-px-2 ptw-flex ptw-items-center"
    >
      <StatePresets
        v-if="ready || !hasCustomControls"
        :story="story"
        :variant="variant"
      />
    </div>

    <!-- Custom controls -->
    <GenericRenderStory
      v-if="hasCustomControls"
      :key="`${story.id}-${variant.id}`"
      slot-name="controls"
      :variant="variant"
      :story="story"
      class="__poveste-render-custom-controls __histoire-render-custom-controls ptw-flex-none"
      @ready="ready = true"
    />

    <!-- Init state -->
    <div
      v-else-if="hasInitState"
    >
      <ControlsComponentState
        class="ptw-flex-none ptw-my-2"
        :variant="variant"
      />
    </div>

    <BaseEmpty v-else-if="!variant.state?._hPropDefs?.length">
      <Icon
        icon="carbon:audio-console"
        class="ptw-w-8 ptw-h-8 ptw-opacity-50 ptw-mb-6"
      />
      <span>No controls available for this story</span>
    </BaseEmpty>

    <!-- Auto props -->
    <div
      v-if="variant.state?._hPropDefs?.length"
    >
      <ControlsComponentProps
        v-for="(def, index) of variant.state._hPropDefs"
        :key="index"
        :variant="variant"
        :definition="def"
        class="ptw-flex-none ptw-my-2"
      />
    </div>
  </div>
</template>
