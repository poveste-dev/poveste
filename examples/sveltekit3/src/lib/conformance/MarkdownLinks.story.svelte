<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType
</script>

<Hst.Story id="conformance-markdown-links" title="Conformance/Markdown links">
  <Hst.Variant id="default" title="default">
    <p class="conformance-links-text">A story whose docs link to another story</p>
  </Hst.Variant>
</Hst.Story>
