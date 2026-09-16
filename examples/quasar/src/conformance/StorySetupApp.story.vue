<script lang="ts" setup>
// Marks the sandbox realm the variant renders in. The DOM rather than a
// provide/inject: the same assertion then reads identically in all four books,
// which is what makes this one shared spec rather than two.
function setupApp() {
  document.documentElement.dataset.storySetupApp = 'ran'
}
</script>

<template>
  <Story
    id="conformance-story-setup-app"
    title="Conformance/Story setup app"
    :setup-app="setupApp"
  >
    <Variant
      id="first"
      title="first"
    >
      <p>First variant</p>
    </Variant>
    <Variant
      id="second"
      title="second"
    >
      <p>Second variant</p>
    </Variant>
  </Story>
</template>
