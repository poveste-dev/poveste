<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Titled "Control bindings" rather than "Controls" to stay out of the vue3
// example's tree groups, which route by a regex on the title:
//
//   { title: 'My Group', include: file => /Code gen|Controls|Docs/.test(file.title) }
//
// A folder is built once per group, so a title matching that regex puts this
// story in `My Group` and every other conformance story in `Components` — two
// `Conformance` folders, each half full. Working as configured, not a bug, and
// the same reason `Conformance/Docs` is titled Documentation. The id is what
// this suite addresses, so the title is free to dodge it.
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
