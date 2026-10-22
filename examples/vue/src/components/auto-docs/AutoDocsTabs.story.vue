<script setup lang="ts">
import { AutoDocsTabsContent, AutoDocsTabsList, AutoDocsTabsRoot, AutoDocsTabsTrigger } from './tabs'
</script>

<!--
  A compound component imported through a barrel (#1432): each part gets a table,
  the root first and open, the rest collapsed.
-->
<template>
  <Story
    id="auto-docs-tabs"
    title="Auto-docs tabs"
  >
    <Variant title="default">
      <AutoDocsTabsRoot model-value="one">
        <AutoDocsTabsList>
          <AutoDocsTabsTrigger value="one">
            One
          </AutoDocsTabsTrigger>
        </AutoDocsTabsList>
        <AutoDocsTabsContent value="one">
          The first tab.
        </AutoDocsTabsContent>
      </AutoDocsTabsRoot>
    </Variant>
  </Story>
</template>
