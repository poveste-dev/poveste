<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ bumps: 0, label: 'start' })
</script>

<Hst.Story id="conformance-concurrent-state" title="Conformance/Concurrent state" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="label" />
  {/snippet}

  <Hst.Variant id="default" title="default">
    {#snippet children({ state })}
      <p class="conformance-state-label">{state.label}</p>
      <p class="conformance-state-bumps">{state.bumps}</p>
      <button class="conformance-state-bump" onclick={() => state.bumps++}>Bump</button>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
