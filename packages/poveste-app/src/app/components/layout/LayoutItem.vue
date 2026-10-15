<script setup lang="ts">
import { Icon } from '@iconify/vue'

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
  <!-- A button: `BaseListItem` is an `<a>` with no href, which a keyboard cannot
       reach (#1351). -->
  <button
    type="button"
    class="poveste-layout-item"
    :class="{ active: isActive }"
    data-slot="layout-item"
    @click="$emit('click')"
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
  </button>
</template>

<style lang="postcss">
.poveste-layout-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.5rem;
  border: 0;
  font: inherit;
  text-align: start;
  color: var(--color-gray-900);
  cursor: pointer;

  &:hover {
    background-color: var(--color-primary-100);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: -2px;
  }

  &.active {
    background-color: var(--color-primary-500);
    color: var(--color-white);

    &:hover {
      background-color: var(--color-primary-600);
    }
  }

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-100);

    &:hover {
      background-color: var(--color-primary-900);
    }

    &.active {
      color: var(--color-black);
    }
  }
}
</style>
