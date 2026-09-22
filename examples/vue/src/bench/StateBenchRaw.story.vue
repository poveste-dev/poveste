<script lang="ts" setup>
// Bench fixture (#960), kind axis: `markRaw`, which stops Vue making the graph
// reactive but not our own walkers reading it.
import { markRaw, ref } from 'vue'
import { treeOf } from './state-graph'

const graph = ref(markRaw(treeOf(15)))
</script>

<template>
  <Story
    id="bench-state-raw"
    title="Bench/State markRaw"
    :init-state="() => ({ text: '' })"
  >
    <template #default="{ state }">
      <div class="bench-state-graph">
        depth {{ graph.d }}
      </div>
      <input
        v-model="state.text"
        class="bench-state-input"
      >
    </template>
  </Story>
</template>
