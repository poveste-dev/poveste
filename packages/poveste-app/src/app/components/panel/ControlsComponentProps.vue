<script lang="ts" setup>
import type { AutoPropComponentDefinition, ComponentDoc } from '@poveste/shared'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstTooltip } from '@poveste/controls'
import { computed } from 'vue'
import { controlOf } from '../../util/prop-controls'
import ControlsComponentPropItem from './ControlsComponentPropItem.vue'

const props = defineProps<{
  variant: Variant
  definition: AutoPropComponentDefinition
  doc?: ComponentDoc | undefined
}>()

const shown = computed(() => props.definition.props.flatMap((prop) => {
  const control = controlOf(prop, props.doc, props.variant.autoProps)
  return control ? [{ prop, control }] : []
}))
</script>

<template>
  <div
    v-if="shown.length"
    class="poveste-controls-component-props"
  >
    <div class="font-mono p-2 flex items-center gap-1">
      <HstTooltip content="Auto-detected props">
        <Icon
          icon="carbon:flash"
          class="w-4 h-4 text-primary-500 flex-none"
        />
      </HstTooltip>
      <div>
        <span class="opacity-30">&lt;</span>{{ definition.name }}<span class="opacity-30">&gt;</span>
      </div>
    </div>

    <ControlsComponentPropItem
      v-for="{ prop, control } of shown"
      :key="prop.name"
      :variant="variant"
      :component="definition"
      :definition="prop"
      :control="control"
    />
  </div>
</template>
