<script lang="ts" setup>
// Bench fixture (#960), kind axis: the input and nothing else, so the rest of
// the axis has a story holding no graph at all to be read against.
</script>

<template>
  <Story
    id="bench-state-control"
    title="Bench/State control"
    :init-state="() => ({ text: '' })"
  >
    <template #default="{ state }">
      <input
        v-model="state.text"
        class="bench-state-input"
      >
    </template>
  </Story>
</template>
