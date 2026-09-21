<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Titled "Date control" rather than "Date": the vue example routes its tree
// groups by a regex on the title, and distinct words keep a locator filtering on
  // one control from matching another. See Controls.story.svelte for the long version.
  const initState = () => ({
    day: '2026-09-20',
    moment: '2026-09-20T14:30',
    unset: '',
  })
</script>

<Hst.Story id="conformance-date" title="Conformance/Date control" {initState}>
  {#snippet controls({ state })}
    <Hst.Date bind:value={state.day} title="Day" />
    <Hst.Date bind:value={state.moment} title="Moment" time />
    <!-- Empty, and showing an hour: the one order in which the value cannot hold
         what is typed, because an ISO string has nowhere to put an hour until it
         has a day (#63). -->
    <Hst.Date bind:value={state.unset} title="Unset" time />
  {/snippet}

  {#snippet children({ state })}
    <pre class="conformance-date-state">{JSON.stringify(state, null, 2)}</pre>
  {/snippet}
</Hst.Story>
