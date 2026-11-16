<script lang="ts" setup>
import type { AutoPropComponentDefinition } from '@poveste/shared'
import type { Story, Variant } from '../../types'
import { computed } from 'vue'
import { useComponentDocs } from '../../util/component-docs'
import { docOf } from '../../util/prop-controls'
import ControlsComponentProps from './ControlsComponentProps.vue'

const props = defineProps<{
  variant: Variant
  story: Story
}>()

// The controls show from what the component carries at once; its types refine them when
// they arrive, which in dev is when the docs worker has read them (#160).
const { components } = useComponentDocs(computed(() => props.story.id))

const definitions = computed(() => props.variant.state._hPropDefs as AutoPropComponentDefinition[])
</script>

<template>
  <div>
    <ControlsComponentProps
      v-for="(definition, index) of definitions"
      :key="index"
      :variant="variant"
      :definition="definition"
      :doc="docOf(definition, components, definitions)"
      class="flex-none my-2"
    />
  </div>
</template>
