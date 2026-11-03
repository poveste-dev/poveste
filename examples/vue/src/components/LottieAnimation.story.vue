<script lang="ts" setup>
import { isCollecting } from 'poveste/client'
import { onMounted, ref } from 'vue'

const el = ref(null)
onMounted(async () => {
  const container = el.value
  if (isCollecting() || !container) return

  const { default: lottie } = await import('lottie-web')
  const animData = {
    container,
    animType: 'svg',
    loop: true,
    autoplay: true,
    path: '/lottie-data.json',
  }
  lottie.loadAnimation(animData)
})
</script>

<template>
  <Story>
    <div ref="el" />
  </Story>
</template>

<style scoped>
div {
  margin: auto;
  width: 90vw;
  height: 90vh;
  overflow: hidden;
}
</style>
