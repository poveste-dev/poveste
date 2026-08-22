<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Sub Folder/Meow/Sub Story 1" layout={{ type: 'grid', width: 200 }}>
  <Hst.Variant title="default">
    <p class="text">This is a sub story</p>
  </Hst.Variant>
</Hst.Story>

<style>
  .text {
    color: var(--histoire-contrast-color);
  }
</style>
