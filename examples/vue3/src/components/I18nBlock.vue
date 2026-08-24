<script setup lang="ts">
// A component carrying an SFC `<i18n>` custom block. With no i18n plugin
// configured the block is inert, but it must not break the build (#65).
</script>

<template>
  <p class="i18n-block">
    Localised copy lives here.
  </p>
</template>

<i18n>
en:
  greeting: Hello
fr:
  greeting: Bonjour
</i18n>
