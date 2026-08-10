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
  .some(([key]) => !key.startsWith('_h')))
</script>

<template>
  <div
    data-test-id="story-controls"
    class="poveste-story-controls flex flex-col divide-y divide-gray-100 dark:divide-gray-750"
  >
    <!-- Toolbar -->
    <div
      class="h-9 flex-none px-2 flex items-center"
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
      class="__poveste-render-custom-controls __histoire-render-custom-controls flex-none"
      @ready="ready = true"
    />

    <!-- Init state -->
    <div
      v-else-if="hasInitState"
    >
      <ControlsComponentState
        class="flex-none my-2"
        :variant="variant"
      />
    </div>

    <BaseEmpty v-else-if="!variant.state?._hPropDefs?.length">
      <Icon
        icon="carbon:audio-console"
        class="w-8 h-8 opacity-50 mb-6"
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
        class="flex-none my-2"
      />
    </div>
  </div>
</template>
