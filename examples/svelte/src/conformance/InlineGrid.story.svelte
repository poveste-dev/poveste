<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story
  id="conformance-inline-grid"
  title="Conformance/Inline grid"
  layout={{ type: 'grid', width: 200, iframeGrid: false }}
>
  <Hst.Variant id="one" title="one">
    <p class="conformance-inline-grid-text">One</p>
  </Hst.Variant>
  <Hst.Variant id="two" title="two">
    <p class="conformance-inline-grid-text">Two</p>
  </Hst.Variant>
</Hst.Story>
