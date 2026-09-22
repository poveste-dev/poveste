<script lang="ts" setup>
// Bench fixture (#960), size axis: one binding, a writable template ref onto the
// graph. Never `useTemplateRef` here — it is readonly in a dev build, and the
// story then measures #959's loop rather than the walk.
import { ref } from 'vue'
import StateGraph from './StateGraph.vue'

const graph = ref(null)
</script>

<template>
  <Story
    id="bench-state-8k"
    title="Bench/State 8k"
    :init-state="() => ({ text: '' })"
  >
    <template #default="{ state }">
      <StateGraph
        ref="graph"
        :depth="12"
      />
      <input
        v-model="state.text"
        class="bench-state-input"
      >
    </template>
  </Story>
</template>
