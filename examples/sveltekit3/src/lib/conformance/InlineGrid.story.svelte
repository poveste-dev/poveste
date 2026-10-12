<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType
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

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. Keyed the
     way `darkMode: 'class'` writes it, which did nothing where the app renders
     the story itself (#332). -->
<style>
  :global(.dark) .conformance-inline-grid-text,
  :global(.my-dark) .conformance-inline-grid-text {
    color: rgb(0, 255, 0);
    font-weight: 700;
  }
</style>
