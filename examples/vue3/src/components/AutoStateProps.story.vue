<script lang="ts" setup>
import AutoStateProps from './AutoStateProps.vue'
import DeclaredProps from './DeclaredProps.vue'
import ShorthandProps from './ShorthandProps.vue'

function initState() {
  return {
    name: 'Fry',
  }
}
</script>

<template>
  <Story
    id="conformance-auto-props"
    title="Auto State & Props"
    :layout="{
      type: 'grid',
      width: 200,
    }"
  >
    <Variant
      id="naked"
      title="Naked"
    >
      <AutoStateProps />
    </Variant>
    <Variant
      id="state"
      title="State"
      :init-state="initState"
    >
      <template #default="{ state }">
        <AutoStateProps :name="state.name" />
      </template>
    </Variant>
    <Variant
      id="declared"
      title="Declared"
    >
      <DeclaredProps />
    </Variant>
    <Variant
      id="shorthand"
      title="Shorthand"
    >
      <ShorthandProps greeting="hi" />
    </Variant>
  </Story>
</template>
