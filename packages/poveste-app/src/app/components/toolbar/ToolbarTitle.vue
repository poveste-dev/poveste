<script lang="ts" setup>
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'

defineProps<{
  variant: Variant
}>()
</script>

<template>
  <div class="poveste-toolbar-title ptw-flex ptw-items-center ptw-gap-1 ptw-text-gray-500 ptw-flex-1 ptw-truncate ptw-min-w-0">
    <Icon
      :icon="variant.icon ?? 'carbon:cube'"
      class="ptw-w-4 ptw-h-4 ptw-opacity-50"
      :class="[
        variant.iconColor ? 'bind-icon-color' : 'ptw-text-gray-500',
      ]"
    />
    <span>{{ variant.title }}</span>
  </div>
</template>
