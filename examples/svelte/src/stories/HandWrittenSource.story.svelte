<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ count: 0 })

  const source = `<h1>Toto</h1>

<input bind:value={count} type="number" />

<p>{count}</p>`
</script>

<Hst.Story title="Hand-written source">
  <Hst.Variant title="Source prop" initState={initState} {source}>
    {#snippet children({ state })}
      <h1>Toto</h1>
      <input bind:value={state.count} type="number" />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
