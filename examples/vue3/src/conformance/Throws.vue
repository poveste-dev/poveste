<script setup lang="ts">
// Deliberately broken: the book has to show that this component threw rather
// than render its template as if it worked (#323).
throw new Error('component blew up on purpose')
</script>

<template>
  <div class="conformance-throws-never">never</div>
</template>
