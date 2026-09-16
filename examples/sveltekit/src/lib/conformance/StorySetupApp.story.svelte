<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Marks the sandbox realm the variant renders in. The DOM rather than
  // context: the same assertion then reads identically in all four books,
  // which is what makes this one shared spec rather than two.
  function setupApp() {
    document.documentElement.dataset.storySetupApp = 'ran'
  }
</script>

<Hst.Story id="conformance-story-setup-app" title="Conformance/Story setup app" {setupApp}>
  <Hst.Variant id="first" title="first">
    <p>First variant</p>
  </Hst.Variant>
  <Hst.Variant id="second" title="second">
    <p>Second variant</p>
  </Hst.Variant>
</Hst.Story>
