<script setup lang="ts">
import AutoDocsButton from './AutoDocsButton.vue'
</script>

<!--
  Auto-docs (#1159): the docs tab reads AutoDocsButton's props from its types,
  through an interface that extends another in a separate file.
-->
<template>
  <Story
    id="auto-docs-button"
    title="Auto-docs button"
  >
    <Variant title="default">
      <AutoDocsButton label="Press me" />
    </Variant>
  </Story>
</template>
