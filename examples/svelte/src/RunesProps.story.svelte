<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  // Runes mode, which the rest of this book is not. `$props()` opts this file in
  // on its own, so the book builds one story the way a project scaffolded by the
  // current `sv create` builds all of them — where `export let` does not compile
  // at all (#1061).
  const { Hst }: { Hst: HstType } = $props()

  const initState = () => ({ label: 'Runes' })
</script>

<Hst.Story title="Runes props" {initState}>
  {#snippet children({ state })}
    <p data-slot="runes-props">{state.label}</p>
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
  {/snippet}
</Hst.Story>
