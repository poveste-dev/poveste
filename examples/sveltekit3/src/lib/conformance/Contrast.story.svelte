<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType
</script>

<Hst.Story id="conformance-contrast" title="Conformance/Contrast">
  <Hst.Variant id="default" title="default">
    <p class="conformance-contrast">Contrast color</p>
  </Hst.Variant>
</Hst.Story>

<style>
  .conformance-contrast {
    color: var(--poveste-contrast-color);
  }
</style>
