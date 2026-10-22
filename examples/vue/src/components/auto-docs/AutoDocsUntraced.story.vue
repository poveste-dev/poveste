<script setup lang="ts">
import { AutoDocsInline } from './inline'
</script>

<!--
  Its only component has no file of its own, so it gets no table, and in dev the
  Docs tab says why (#1432).
-->
<template>
  <Story
    id="auto-docs-untraced"
    title="Auto-docs untraced"
  >
    <Variant title="default">
      <AutoDocsInline label="Untraced" />
    </Variant>
  </Story>
</template>
