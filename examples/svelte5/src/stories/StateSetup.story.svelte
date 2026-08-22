<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // The vue3 counterpart declares this with `reactive()` and a `ref()` in
  // `<script setup>` and lets the plugin capture it. Svelte has no equivalent
  // capture, and could not: a story is mounted once per slot, so a
  // component-local variable exists twice and the two copies never meet.
  // `initState` is the mechanism — one object, owned by poveste, shared by both
  // mounts and carried across the sandbox bridge.
  const initState = () => ({
    count: 0,
    text: 'Meow',
    synced: 'hello',
  })
</script>

<Hst.Story title="StateSetup" {initState}>
  <Hst.Variant title="default">
    {#snippet controls({ state })}
      <div class="controls">
        <button onclick={() => state.count--}>-1</button>
        <button onclick={() => state.count++}>+1</button>
        <span>{state.count}</span>
      </div>
      <Hst.Text bind:value={state.text} title="Text" />
      <Hst.Text bind:value={state.synced} title="synced" />
    {/snippet}

    {#snippet children({ state })}
      <h1>State</h1>
      <div>
        <pre>{JSON.stringify({ count: state.count, text: state.text }, null, 2)}</pre>
        <div>{JSON.stringify({ synced: state.synced })}</div>
        <input bind:value={state.count} type="number" />
        <input bind:value={state.text} />
        <input bind:value={state.synced} />
      </div>
    {/snippet}
  </Hst.Variant>
</Hst.Story>

<style>
  .controls {
    margin: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  button {
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
