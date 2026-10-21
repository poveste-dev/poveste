<script setup lang="ts">
import AutoDocsTabsDemo from './_AutoDocsTabsDemo.vue'
import { AutoDocsTabsTrigger } from './tabs'
</script>

<!--
  A story that renders a helper names what it documents (#1432): one table, for
  the trigger, and none for the helper.
-->
<template>
  <Story
    id="auto-docs-named"
    title="Auto-docs named"
    :component="AutoDocsTabsTrigger"
  >
    <Variant title="default">
      <AutoDocsTabsDemo />
    </Variant>
  </Story>
</template>
