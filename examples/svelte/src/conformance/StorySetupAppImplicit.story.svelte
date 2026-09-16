<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // The implicit half of `StorySetupApp`: no `<Hst.Variant>` children, so the
  // handler can only come from the story. Split from the explicit story because
  // a story either declares variants or does not.
  function setupApp() {
    document.documentElement.dataset.storySetupApp = 'implicit'
  }
</script>

<Hst.Story id="conformance-story-setup-app-implicit" title="Conformance/Story setup app, implicit" {setupApp}>
  <p>Implicit variant</p>
</Hst.Story>
