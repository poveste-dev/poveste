<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Titled "Control bindings" rather than "Controls" for the same reason
// `Conformance/Docs` is titled Documentation: a story titled `A/B` makes the
// tree grow a *second* `A` folder when another story is titled exactly `B` at
// the top level, and vue3 has one called Controls. The id is what this suite
// addresses, so the title is free to dodge it.
//
// Titles are deliberately distinct words rather than the control's own name:
  // a locator filtering on "Text" would match "Textarea" too, and the resulting
  // failure looks like a broken control rather than a broken selector.
  const games = {
    'crash-bandicoot': 'Crash Bandicoot',
    'the-last-of-us': 'The Last of Us',
  }

  const initState = () => ({
    label: 'Hello',
    enabled: false,
    count: 20,
    notes: 'Longer text...',
    game: 'crash-bandicoot',
    tint: '#000000',
  })
</script>

<Hst.Story id="conformance-controls" title="Conformance/Control bindings" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
    <Hst.Checkbox bind:value={state.enabled} title="Enabled" />
    <Hst.Number bind:value={state.count} title="Count" />
    <Hst.Textarea bind:value={state.notes} title="Notes" />
    <Hst.Select bind:value={state.game} options={games} title="Game" />
    <Hst.ColorSelect bind:value={state.tint} title="Tint" />
  {/snippet}

  {#snippet children({ state })}
    <pre class="conformance-controls-state">{JSON.stringify(state, null, 2)}</pre>
  {/snippet}
</Hst.Story>
