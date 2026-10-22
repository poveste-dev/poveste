<script lang="ts">
export interface PairedEmits {
  /** Fired when the dialog opens or closes. */
  'update:open': [value: boolean]
}
</script>

<script setup lang="ts">
defineEmits<PairedEmits>()
</script>

<template>
  <div />
</template>
