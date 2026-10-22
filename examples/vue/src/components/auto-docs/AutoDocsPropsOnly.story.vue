<script setup lang="ts">
import AutoDocsButton from './AutoDocsButton.vue'
</script>

<!-- Per-story auto-docs (#1398): only the props section of the same component's table. -->
<template>
  <Story
    id="auto-docs-props-only"
    title="Auto-docs props only"
    :auto-docs="['props']"
  >
    <Variant title="default">
      <AutoDocsButton label="Props only" />
    </Variant>
  </Story>
</template>
