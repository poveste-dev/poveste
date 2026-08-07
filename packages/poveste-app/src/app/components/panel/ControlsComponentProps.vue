<script lang="ts" setup>
import type { AutoPropComponentDefinition } from '@poveste/shared'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import ControlsComponentPropItem from './ControlsComponentPropItem.vue'

defineProps<{
  variant: Variant
  definition: AutoPropComponentDefinition
}>()
</script>

<template>
  <div class="poveste-controls-component-props">
    <div class="font-mono p-2 flex items-center gap-1">
      <Icon
        v-tooltip="'Auto-detected props'"
        icon="carbon:flash"
        class="w-4 h-4 text-primary-500 flex-none"
      />
      <div>
        <span class="opacity-30">&lt;</span>{{ definition.name }}<span class="opacity-30">&gt;</span>
      </div>
    </div>

    <ControlsComponentPropItem
      v-for="prop of definition.props"
      :key="prop.name"
      :variant="variant"
      :component="definition"
      :definition="prop"
    />
  </div>
</template>
