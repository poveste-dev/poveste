<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const el = ref<HTMLElement>()
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(() => {})
  observer.observe(el.value!)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="el">
    measured
  </div>
</template>
