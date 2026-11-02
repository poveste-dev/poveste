<script>
  import ComparesProxy from './parts/ComparesProxy.svelte'
  import Throws from './parts/Throws.svelte'
  import ThrowsInEffect from './parts/ThrowsInEffect.svelte'
  import Warns from './parts/Warns.svelte'

  const { Hst } = $props()

  // A Svelte `initState` returns the state; it is not awaited.
  function throws() {
    throw new Error('initState threw on purpose')
  }
</script>

<Hst.Story title="Failing">
  <Hst.Variant title="throws in render"><Throws /></Hst.Variant>
  <Hst.Variant title="throws in an effect"><ThrowsInEffect /></Hst.Variant>
  <Hst.Variant title="warns"><Warns /></Hst.Variant>
  <Hst.Variant title="compares a state proxy"><ComparesProxy /></Hst.Variant>
  <Hst.Variant title="throws in initState" initState={throws}><p>threw</p></Hst.Variant>
  <Hst.Variant title="fine"><p>fine</p></Hst.Variant>
</Hst.Story>
