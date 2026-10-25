<script setup lang="ts">
await new Promise(resolve => setTimeout(resolve, 20))
throw new Error('threw after an await on purpose')
</script>

<template>
  <span>never</span>
</template>
