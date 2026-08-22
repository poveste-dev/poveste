<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // The vue3 counterpart declares this in an Options API `data()`. Svelte's
  // nearest form is a value that already exists outside the story — a constant,
  // a prop, something imported — seeded into the state poveste owns. The
  // difference from `StateSetup` is where the initial value comes from, not how
  // it is bound.
  const OPTION_DATA = 'OPTION API'
</script>

<Hst.Story title="StateOption" initState={() => ({ optionApiData: OPTION_DATA })}>
  <Hst.Variant>
    {#snippet controls({ state })}
      <Hst.Text bind:value={state.optionApiData} title="optionApiData" />
    {/snippet}

    {#snippet children({ state })}
      <h1>State</h1>
      <div>
        <pre class="state-output">{JSON.stringify({ optionApiData: state.optionApiData }, null, 2)}</pre>
        <input bind:value={state.optionApiData} />
      </div>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
