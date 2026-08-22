<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Same state as `StateSetup`, declared through a module-level factory rather
  // than inline — the Svelte counterpart to the vue3 book writing one of these
  // with `<script setup>` and the other with an Options `setup()`. The point of
  // the pair is that where the factory lives makes no difference; what it
  // returns is what poveste owns.
  function makeState() {
    return {
      count: 0,
      text: 'Meow',
      synced: 'hello',
    }
  }
</script>

<Hst.Story title="StateSetup2" initState={makeState}>
  <Hst.Variant title="default">
    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="Text" />
      <Hst.Text bind:value={state.synced} title="synced" />
    {/snippet}

    {#snippet children({ state })}
      <h1>State</h1>
      <pre>{JSON.stringify({ count: state.count, text: state.text }, null, 2)}</pre>
      <div>{JSON.stringify({ synced: state.synced })}</div>
      <input bind:value={state.text} />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
