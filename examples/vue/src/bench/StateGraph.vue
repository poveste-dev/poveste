<script lang="ts" setup>
import { objectsAt, treeOf } from './state-graph'

const props = defineProps<{ depth: number }>()

/*
 * Built here rather than in the story, which is the whole reason this component
 * exists. `addImplicitState` registers every top-level `<script setup>` binding
 * of a story as implicit state (#959), so a `const nodes = treeOf(15)` beside
 * the template ref would be a second binding onto the same graph — and the size
 * axis would be measuring a direct binding and a template ref at once.
 *
 * `defineExpose` rather than relying on setup state: `<script setup>` bindings
 * are not exposed on the instance in a production build, and the bench measures
 * a built book.
 */
const nodes = treeOf(props.depth)
defineExpose({ nodes })
</script>

<template>
  <div class="bench-state-graph">
    {{ objectsAt(depth) }} objects, depth {{ depth }}
  </div>
</template>
