<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({
    label: 'start',
  })
</script>

<!--
  A builtin control in the story's own content, not in its `controls` snippet.
  Collection renders this content to find the variants, and had no `Hst.Text` to
  render: one story like this stopped a Svelte book's build (#925).
-->
<Hst.Story id="conformance-control-in-default-slot" title="Conformance/Control in default slot" {initState}>
  {#snippet children({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
    <p class="conformance-default-slot-label">{state.label}</p>
  {/snippet}
</Hst.Story>
