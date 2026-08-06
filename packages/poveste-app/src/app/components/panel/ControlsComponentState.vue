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
    <div class="ptw-p-2 ptw-flex ptw-items-center ptw-gap-1">
      <Icon
        v-tooltip="'Auto-detected state'"
        icon="carbon:data-vis-1"
        class="ptw-w-4 ptw-h-4 ptw-text-primary-500 ptw-flex-none"
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
