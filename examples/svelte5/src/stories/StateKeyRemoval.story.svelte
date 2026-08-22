<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ label: 'start', extras: { keep: 1, drop: 2 } })
</script>

<Hst.Story title="State key removal" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="label" />
  {/snippet}

  {#snippet children({ state })}
    <p data-testid="label">{state.label}</p>
    <p data-testid="extras">{Object.keys(state.extras).join(',')}</p>
    <button data-testid="drop" onclick={() => { delete state.extras.drop }}>Drop a key</button>
  {/snippet}
</Hst.Story>
