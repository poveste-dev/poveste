<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-dark" title="Conformance/Dark">
  <Hst.Variant id="default" title="default">
    <p class="conformance-dark-text">Styled by the consumer's own dark rule</p>
    <p class="conformance-dark-only">Dark only</p>
  </Hst.Variant>
</Hst.Story>

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. -->
<style>
  .conformance-dark-only { display: none }

  :global(.dark) .conformance-dark-text,
  :global(.my-dark) .conformance-dark-text {
    color: rgb(255, 255, 255);
    font-weight: 700;
  }

  :global(.dark) .conformance-dark-only,
  :global(.my-dark) .conformance-dark-only { display: block }
</style>
