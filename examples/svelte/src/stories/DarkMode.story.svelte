<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Dark mode">
  <Hst.Variant title="default">
    <div class="meow">
      <span class="only-dark">Dark</span>
      Meow
    </div>
  </Hst.Variant>
</Hst.Story>

<!-- Keyed on `my-dark`, this book's `theme.darkClass`. `:global()` because the
     class is on an ancestor outside this component, and Svelte would otherwise
     prune the rule as unused. -->
<style>
  .only-dark { display: none }

  :global(.my-dark) .meow {
    color: #fff;
    font-size: 20px;
    font-weight: bold;
  }

  :global(.my-dark) .only-dark { display: inline }
</style>
