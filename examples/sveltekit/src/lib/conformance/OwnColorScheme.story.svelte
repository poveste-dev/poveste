<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story
  id="conformance-own-color-scheme"
  title="Conformance/Own colour scheme"
>
  <Hst.Variant id="default" title="default">
    <!-- The book pins its own scheme, which the preview setting must not override (#1167). -->
    <div class="conformance-own-color-scheme">
      <input data-widget="checkbox" type="checkbox" checked aria-label="Checkbox" />
    </div>
  </Hst.Variant>
</Hst.Story>

<style>
  :global(:root:has(.conformance-own-color-scheme)) {
    color-scheme: light;
  }
</style>
