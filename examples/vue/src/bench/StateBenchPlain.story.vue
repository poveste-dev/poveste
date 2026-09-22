<script lang="ts" setup>
// Bench fixture (#960), kind axis: the graph bound directly, with nothing asking
// the walk to stop.
import { ref } from 'vue'
import { treeOf } from './state-graph'

const graph = ref(treeOf(15))
</script>

<template>
  <Story
    id="bench-state-plain"
    title="Bench/State plain"
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
