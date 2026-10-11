<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<!--
  Forces its options pane on. With the reader's Story Options switch off, this
  story still shows the pane, and a story that sets nothing does not (#1261).
-->
<Hst.Story id="conformance-story-options-on" title="Conformance/Story options on" meta={{ storyOptions: true }}>
  <Hst.Variant>
    <p class="conformance-story-options-on-text">Story options forced on</p>
  </Hst.Variant>
</Hst.Story>
