<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Titled "Colour picker" rather than "Color": the vue example routes its tree
// groups by a regex on the title, and distinct words keep a locator filtering on
  // one control from matching another. See Controls.story.svelte for the long version.
  const initState = () => ({
    tint: '#3366ff',
  })
</script>

<Hst.Story id="conformance-color" title="Conformance/Colour picker" {initState}>
  {#snippet controls({ state })}
    <Hst.Color bind:value={state.tint} title="Tint" />
  {/snippet}

  {#snippet children({ state })}
    <pre class="conformance-color-state">{JSON.stringify(state, null, 2)}</pre>
  {/snippet}
</Hst.Story>
