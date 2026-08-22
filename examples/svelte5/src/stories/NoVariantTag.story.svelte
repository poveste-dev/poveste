<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ meow: { foo: 'bar' } })
</script>

<Hst.Story title="No variant tag" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.meow.foo} title="meow.foo" />
  {/snippet}

  {#snippet children({ state })}
    <input bind:value={state.meow.foo} />
  {/snippet}
</Hst.Story>
