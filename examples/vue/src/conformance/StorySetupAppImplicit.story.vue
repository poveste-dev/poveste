<script lang="ts" setup>
// The implicit half of `StorySetupApp`: no `<Variant>` children, so the handler
// can only come from the story. Split from the explicit story because a story
// either declares variants or does not — the two paths cannot share one file.
function setupApp() {
  document.documentElement.dataset.storySetupApp = 'implicit'
}
</script>

<template>
  <Story
    id="conformance-story-setup-app-implicit"
    title="Conformance/Story setup app, implicit"
    :setup-app="setupApp"
  >
    <p>Implicit variant</p>
  </Story>
</template>
