<script lang="ts" setup>
// Titled "Colour picker" rather than "Color": the vue example routes its tree
// groups by a regex on the title, and distinct words keep a locator filtering on
// one control from matching another. See Controls.story.vue for the long version.
function initState() {
  return {
    tint: '#3366ff',
  }
}
</script>

<template>
  <Story
    id="conformance-color"
    title="Conformance/Colour picker"
    :init-state="initState"
  >
    <template #default="{ state }">
      <pre class="conformance-color-state">{{ JSON.stringify(state, null, 2) }}</pre>
    </template>

    <template #controls="{ state }">
      <HstColor
        v-model="state.tint"
        title="Tint"
      />
    </template>
  </Story>
</template>
