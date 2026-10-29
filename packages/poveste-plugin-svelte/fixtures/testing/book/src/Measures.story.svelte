<script>
  import Measured from './parts/Measured.svelte'

  const { Hst } = $props()
</script>

<Hst.Story title="Measures">
  <Hst.Variant title="observed"><Measured /></Hst.Variant>
</Hst.Story>
