<script>
  import SetUp from './parts/SetUp.svelte'

  const { Hst } = $props()

  async function initState() {
    return { count: 2 }
  }
</script>

<Hst.Story title="Passing">
  <Hst.Variant title="plain"><p>plain</p></Hst.Variant>
  <Hst.Variant title="from initState" {initState}>
    {#snippet children({ state })}<p>{state.count}</p>{/snippet}
  </Hst.Variant>
  <Hst.Variant title="from the setup file"><SetUp /></Hst.Variant>
</Hst.Story>
