<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story
  id="conformance-grid"
  title="Conformance/Grid"
  layout={{ type: 'grid', width: 200 }}
>
  <Hst.Variant id="one" title="one">
    <p class="conformance-text">One</p>
  </Hst.Variant>
  <Hst.Variant id="two" title="two">
    <p class="conformance-text">Two</p>
  </Hst.Variant>
  <Hst.Variant id="three" title="three">
    <p class="conformance-text">Three</p>
  </Hst.Variant>
</Hst.Story>

<style>
  .conformance-text {
    color: var(--poveste-contrast-color);
  }
</style>
