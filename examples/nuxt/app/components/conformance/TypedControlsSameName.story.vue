<script setup lang="ts">
import OtherBadge from './typed/TypedBadge.vue'
import TypedBadge from './TypedBadge.vue'
</script>

<!-- Two components of one name: neither may be given the other's types (#160). -->
<template>
  <Story
    id="conformance-typed-controls-same-name"
    title="Typed props, same name"
  >
    <Variant
      id="same-name"
      title="Same name"
    >
      <TypedBadge label="First" />
      <OtherBadge :size="2" />
    </Variant>
  </Story>
</template>
