<script lang="ts" setup>
import DeclaredProps from './DeclaredProps.vue'
</script>

<template>
  <Story
    id="conformance-auto-props-disabled"
    title="Auto props disabled"
    auto-props-disabled
    :layout="{
      type: 'grid',
      width: 200,
    }"
  >
    <Variant
      id="first"
      title="First"
    >
      <DeclaredProps label="first" />
    </Variant>
    <Variant
      id="second"
      title="Second"
    >
      <DeclaredProps label="second" />
    </Variant>
  </Story>
</template>
