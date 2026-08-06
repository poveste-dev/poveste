<script lang="ts" setup>
defineProps<{
  isActive?: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

function handleNavigate() {
  emit('navigate')
}
</script>

<template>
  <a
    class="istoire-base-list-ite ptw-flex ptw-items-center ptw-gap-2 ptw-text-gray-900 dark:ptw-text-gray-100"
    :class="[
      $attrs.class,
      isActive
        ? 'active ptw-bg-primary-500 hover:ptw-bg-primary-600 ptw-text-white dark:ptw-text-black'
        : 'hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-900',
    ]"
    @click="handleNavigate()"
    @keyup.enter="handleNavigate()"
    @keyup.space="handleNavigate()"
  >
    <slot />
  </a>
</template>
