<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story
  id="conformance-no-iframe"
  title="Conformance/No iframe"
  layout={{ type: 'single', iframe: false }}
>
  <Hst.Variant id="default" title="default">
    <p class="conformance-inline">Rendered without an iframe</p>
  </Hst.Variant>
</Hst.Story>

<style>
  .conformance-inline {
    color: var(--poveste-contrast-color);
  }
</style>
