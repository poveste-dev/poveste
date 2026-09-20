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

      <!-- The same control in the story's own realm. It is lazily loaded, and a
           dynamic import resolved against the wrong base would fail here and
           nowhere else — a control that never appears, with nothing in the
           console of the page being looked at (#63). -->
      <HstColor
        v-model="state.tint"
        title="Sandbox"
      />
    </template>

    <template #controls="{ state }">
      <HstColor
        v-model="state.tint"
        title="Tint"
      />
    </template>
  </Story>
</template>
