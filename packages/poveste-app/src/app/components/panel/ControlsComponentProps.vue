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
    <div class="ptw-font-mono ptw-p-2 ptw-flex ptw-items-center ptw-gap-1">
      <Icon
        v-tooltip="'Auto-detected props'"
        icon="carbon:flash"
        class="ptw-w-4 ptw-h-4 ptw-text-primary-500 ptw-flex-none"
      />
      <div>
        <span class="ptw-opacity-30">&lt;</span>{{ definition.name }}<span class="ptw-opacity-30">&gt;</span>
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
