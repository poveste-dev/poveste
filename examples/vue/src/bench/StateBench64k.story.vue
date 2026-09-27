<script lang="ts" setup>
// Bench fixture (#960), size axis: the graph bound directly and unmarked, which
// is the only shape left that walks.
//
// It used to be a writable template ref onto a component's `defineExpose`, and
// Vue marks an exposed object raw itself — so once #974 taught the walkers to
// stop at `__v_skip`, all four sizes cost the control and the axis had a dynamic
// range of 1.0x (#976). The component also existed to keep the graph out of the
// story's own bindings; built here instead, `graph` is the one binding, which is
// what the axis wants to price.
import { ref } from 'vue'
import { objectsAt, treeOf } from './state-graph'

const graph = ref(treeOf(15))
</script>

<template>
  <Story
    id="bench-state-64k"
    title="Bench/State 64k"
    :init-state="() => ({ text: '' })"
  >
    <!-- The template has to read `graph`, or a production build is free to drop a
         `<script setup>` binding nothing references — and the story would measure
         no graph at all, which is the defect above in another costume. `d` is
         absent on a depth-0 tree, which is a bare leaf. -->
    <template #default="{ state }">
      <div class="bench-state-graph">
        {{ objectsAt(graph.d ?? 0) }} objects, depth {{ graph.d ?? 0 }}
      </div>
      <input
        v-model="state.text"
        class="bench-state-input"
      >
    </template>
  </Story>
</template>
