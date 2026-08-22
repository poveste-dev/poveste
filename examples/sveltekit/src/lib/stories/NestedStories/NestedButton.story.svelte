<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import NestedButton from './NestedButton.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="NestedButton">
  <Hst.Variant title="default">
    <NestedButton>Click me</NestedButton>
  </Hst.Variant>
</Hst.Story>
