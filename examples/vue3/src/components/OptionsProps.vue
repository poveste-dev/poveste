<script lang="ts">
// The Options API, which declares props at runtime and so is the one spelling a
// production build cannot erase — and the one no `<script setup>` fixture
// reaches, since none of them go through this path.
export default {
  props: {
    label: { type: String, default: 'options' },
    count: { type: Number, default: 2 },
  },
}
</script>

<template>
  <span class="conformance-options-props">{{ label }}/{{ count }}</span>
</template>
