<script setup lang="ts">
import { Icon } from '@iconify/vue'
import BaseListItem from '../base/BaseListItem.vue'

defineProps<{
  title: string
  icon: string
  stateIcon?: string
  isActive?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <BaseListItem
    :is-active="isActive"
    class="ptw-px-6 ptw-py-4 ptw-gap-4"
    @navigate="$emit('click')"
  >
    <Icon
      class="ptw-w-4 ptw-h-4 ptw-flex-none"
      :icon="icon"
      aria-hidden="true"
    />
    <span class="ptw-flex-1">{{ title }}</span>
    <Icon
      v-if="stateIcon"
      class="ptw-w-4 ptw-h-4 ptw-flex-none ptw-opacity-70"
      :icon="stateIcon"
      aria-hidden="true"
    />
  </BaseListItem>
</template>
