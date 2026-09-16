<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ count: 0, text: '' })
  const initState2 = () => ({ meow: { foo: 'bar' } })
</script>

<Hst.Story title="State">
  <Hst.Variant title="default" initState={initState}>
    {#snippet controls({ state })}
      <div class="controls">
        <button onclick={() => state.count--}>-1</button>
        <button onclick={() => state.count++}>+1</button>
        <span>{state.count}</span>
      </div>
      <Hst.Text bind:value={state.text} title="Text" />
    {/snippet}

    {#snippet children({ state })}
      <h1>State</h1>
      <div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
        <input bind:value={state.count} type="number" />
        <input bind:value={state.text} />
      </div>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="Nested state object" initState={initState2}>
    {#snippet controls({ state })}
      <Hst.Text bind:value={state.meow.foo} title="meow.foo" />
    {/snippet}

    {#snippet children({ state })}
      <input bind:value={state.meow.foo} />
    {/snippet}
  </Hst.Variant>
</Hst.Story>

<style>
  .controls {
    margin: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
