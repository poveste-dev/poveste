<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-story-embed" title="Conformance/Story embed">
  <Hst.Variant id="default" title="default">
    <p class="conformance-story-embed-text">A story whose docs embed other stories</p>
  </Hst.Variant>
</Hst.Story>
