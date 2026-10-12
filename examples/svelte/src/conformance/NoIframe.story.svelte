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
    <p class="conformance-no-iframe-dark">Styled by the book's own dark rule</p>
  </Hst.Variant>
</Hst.Story>

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. Keyed the
     way `darkMode: 'class'` writes it, which did nothing where the app renders
     the story itself (#332). -->
<style>
  .conformance-inline {
    color: var(--poveste-contrast-color);
  }

  :global(.dark) .conformance-no-iframe-dark,
  :global(.my-dark) .conformance-no-iframe-dark {
    color: rgb(0, 255, 0);
    font-weight: 700;
  }
</style>
