<script setup lang="ts">
import AutoDocsButton from './AutoDocsButton.vue'
</script>

<!--
  Per-story auto-docs (#1398): this story imports the same component as
  `auto-docs-button` and turns its own table off.
-->
<template>
  <Story
    id="auto-docs-off"
    title="Auto-docs off"
    :auto-docs="false"
  >
    <Variant title="default">
      <AutoDocsButton label="No table" />
    </Variant>
  </Story>
</template>
