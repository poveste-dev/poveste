<script setup lang="ts">
import TypedBadge from './TypedBadge.vue'
</script>

<template>
  <Story
    id="conformance-typed-controls"
    title="Typed props"
  >
    <Variant
      id="typed"
      title="Typed"
    >
      <TypedBadge
        label="Typed"
        size="md"
        tone="info"
      />
    </Variant>
    <Variant
      id="overridden"
      title="Overridden"
      :auto-props="{ tone: 'text', level: { control: 'slider', min: 1, max: 6 }, secret: false }"
    >
      <TypedBadge label="Overridden" />
    </Variant>
  </Story>
</template>
