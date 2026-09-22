<script lang="ts" setup>
// Bench fixture (#960), kind axis: the same binding `bench-state-64k` uses, so
// the kind table can be read without reaching across to the size table.
import { ref } from 'vue'
import StateGraph from './StateGraph.vue'

const graph = ref(null)
</script>

<template>
  <Story
    id="bench-state-ref"
    title="Bench/State ref"
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
