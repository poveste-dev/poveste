<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import AutoStateProps from './AutoStateProps.svelte'

  export let Hst: Hst

  function initState() {
    return {
      name: 'Fry',
    }
  }
</script>

<Hst.Story id="conformance-auto-props" title="Auto State & Props" layout={{ type: 'grid', width: 200 }}>
  <Hst.Variant id="naked" title="Naked">
    <AutoStateProps />
  </Hst.Variant>
  <Hst.Variant id="state" title="State" {initState}>
    {#snippet children({ state })}
      <AutoStateProps name={state.name} />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
