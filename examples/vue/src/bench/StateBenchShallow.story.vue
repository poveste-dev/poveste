<script lang="ts" setup>
// Bench fixture (#960), kind axis: `shallowRef`, which makes only the ref's own
// value reactive.
import { shallowRef } from 'vue'
import { treeOf } from './state-graph'

const graph = shallowRef(treeOf(15))
</script>

<template>
  <Story
    id="bench-state-shallow"
    title="Bench/State shallowRef"
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
