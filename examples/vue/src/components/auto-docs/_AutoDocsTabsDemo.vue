<script setup lang="ts">
import { AutoDocsTabsContent, AutoDocsTabsList, AutoDocsTabsRoot, AutoDocsTabsTrigger } from './tabs'
</script>

<template>
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
</template>
