<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-loaded-markdown" title="Conformance/Loaded markdown">
  <Hst.Variant id="default" title="default">
    <p class="conformance-loaded-markdown-text">A story whose docs live in another file</p>
  </Hst.Variant>
</Hst.Story>
