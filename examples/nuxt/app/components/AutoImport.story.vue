<script setup>
const config = useRuntimeConfig()
</script>

<template>
  <Story
    title="Nuxt/AutoImport"
  >
    <Meow />

    <h3>Nuxt runtime config</h3>
    <pre>{{ config.public }}</pre>
    <p data-testid="config">
      {{ config.public.configFromNuxt }}
    </p>
  </Story>
</template>
