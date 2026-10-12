<script lang="ts" setup>
function initState() {
  return {
    label: 'start',
  }
}
</script>

<template>
  <!--
    A builtin control in the story's own content, not in its `controls` slot.
    Collection renders this content to find the variants, and in a Svelte book
    it had no control to render: one story like this stopped the build (#925).
  -->
  <Story
    id="conformance-control-in-default-slot"
    title="Conformance/Control in default slot"
    :init-state="initState"
  >
    <template #default="{ state }">
      <HstText
        v-model="state.label"
        title="Label"
      />
      <p class="conformance-default-slot-label">
        {{ state.label }}
      </p>
    </template>
  </Story>
</template>
