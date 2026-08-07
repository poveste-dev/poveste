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
    class="poveste-base-list-item flex items-center gap-2 text-gray-900 dark:text-gray-100"
    :class="[
      $attrs.class,
      isActive
        ? 'active bg-primary-500 hover:bg-primary-600 text-white dark:text-black'
        : 'hover:bg-primary-100 dark:hover:bg-primary-900',
    ]"
    @click="handleNavigate()"
    @keyup.enter="handleNavigate()"
    @keyup.space="handleNavigate()"
  >
    <slot />
  </a>
</template>
