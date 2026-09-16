<script lang="ts" setup>
const nuxtApp = useNuxtApp()
</script>

<template>
  <Story title="Nuxt/Plugin provide" :layout="{ type: 'single', iframe: true }">
    <Variant title="injected value">
      <p data-testid="plugin-provided">
        {{ nuxtApp.$greeting ?? 'not provided' }}
      </p>
      <p data-testid="runtime-config">
        {{ nuxtApp.$config ? 'runtime config present' : 'no runtime config' }}
      </p>
    </Variant>
  </Story>
</template>
