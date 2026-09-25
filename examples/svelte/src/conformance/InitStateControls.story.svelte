<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // No controls snippet, on purpose. With none, the panel builds a control per
  // state key out of `initState` alone — a documented feature with, until this
  // story, no conformance coverage at all, which is how a Svelte book came to
  // show "No controls available" for a story a Vue book gives three controls.
  const initState = () => ({
    label: 'start',
    count: 1,
    enabled: false,
  })
</script>

<Hst.Story id="conformance-init-state-controls" title="Conformance/Init state controls" {initState}>
  <Hst.Variant id="default" title="default">
    {#snippet children({ state })}
      <p class="conformance-init-label">{state.label}</p>
      <p class="conformance-init-count">{state.count}</p>
      <p class="conformance-init-enabled">{String(state.enabled)}</p>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
