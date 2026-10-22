<script setup lang="ts">
defineSlots<{
  /** The dialog's content. */
  default?: (props: {
    /** Current open state */
    open: boolean
    /** Close the dialog */
    close: () => void
  }) => any
  trigger?: () => any
}>()
</script>

<template>
  <div>
    <slot name="trigger" />
    <slot
      :open="true"
      :close="() => {}"
    />
  </div>
</template>
