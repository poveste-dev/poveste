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
    class="px-6 py-4 gap-4"
    @navigate="$emit('click')"
  >
    <Icon
      class="w-4 h-4 flex-none"
      :icon="icon"
      aria-hidden="true"
    />
    <span class="flex-1">{{ title }}</span>
    <Icon
      v-if="stateIcon"
      class="w-4 h-4 flex-none opacity-70"
      :icon="stateIcon"
      aria-hidden="true"
    />
  </BaseListItem>
</template>
