<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import Store from './Store.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Store">
  <Store />
</Hst.Story>
