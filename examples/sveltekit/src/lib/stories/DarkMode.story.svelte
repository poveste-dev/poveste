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

<!-- Keyed on `dark`, the default `theme.darkClass`, which this book does not
     override. `:global()` because the class is on an ancestor outside this
     component, and Svelte would otherwise prune the rule as unused. -->
<style>
  .only-dark { display: none }

  :global(.dark) .meow {
    color: #fff;
    font-size: 20px;
    font-weight: bold;
  }

  :global(.dark) .only-dark { display: inline }
</style>
