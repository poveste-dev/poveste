<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story>
  <p class="contrast-color">Contrast color</p>
  <p>Other text</p>
</Hst.Story>

<style>
  .contrast-color {
    color: var(--histoire-contrast-color);
  }
</style>
