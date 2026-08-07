<script setup lang="ts">
import type { Variant } from '@poveste/shared'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import ControlsComponentStateItem from './ControlsComponentStateItem.vue'

const props = defineProps<{
  variant: Variant
}>()

const stateKeys = computed(() => Object.keys(props.variant.state || {})
  .filter(key => !key.startsWith('_h')))
</script>

<template>
  <div class="poveste-controls-component-init-state">
    <div class="p-2 flex items-center gap-1">
      <Icon
        v-tooltip="'Auto-detected state'"
        icon="carbon:data-vis-1"
        class="w-4 h-4 text-primary-500 flex-none"
      />
      <div>
        State
      </div>
    </div>
    <ControlsComponentStateItem
      v-for="key of stateKeys"
      :key="key"
      :item="key"
      :variant="variant"
    />
  </div>
</template>

<style scoped>

</style>
