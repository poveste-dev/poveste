<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import Responsive from './Responsive.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Responsive">
  <Hst.Variant title="default">
    <Responsive />
  </Hst.Variant>
</Hst.Story>
