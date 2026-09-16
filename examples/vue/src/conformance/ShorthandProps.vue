<script lang="ts" setup>
// The array form: no types at all, in dev or in a build, and the shape whose
// keys `for…in` used to read as indices (#498).
defineProps(['greeting'])
</script>

<template>
  <span class="conformance-shorthand-props">{{ greeting }}</span>
</template>
