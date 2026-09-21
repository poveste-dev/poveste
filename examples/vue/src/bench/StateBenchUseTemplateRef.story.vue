<script lang="ts" setup>
// Bench fixture (#960), kind axis: the one story allowed `useTemplateRef`, to
// hold #959 failing. It returns a readonly ref in a dev build, the setter's
// write is refused, and the sandbox never goes quiet — so every number taken
// here measures that loop, not the walk. The size axis uses `ref(null)`.
import { useTemplateRef } from 'vue'
import StateGraph from './StateGraph.vue'

const graph = useTemplateRef('graph')
</script>

<template>
  <Story
    id="bench-state-usetemplateref"
    title="Bench/State useTemplateRef"
    :init-state="() => ({ text: '' })"
  >
    <template #default="{ state }">
      <StateGraph
        ref="graph"
        :depth="15"
      />
      <input
        v-model="state.text"
        class="bench-state-input"
      >
    </template>
  </Story>
</template>
