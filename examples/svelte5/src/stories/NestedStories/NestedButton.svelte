<script lang="ts">
  import type { Snippet } from 'svelte'

  export let children: Snippet | undefined
</script>

<button class="nested-button">
  {#if children}{@render children()}{/if}
</button>

<style>
  .nested-button {
    padding: 4px 12px;
  }
</style>
