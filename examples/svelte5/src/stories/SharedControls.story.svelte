<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const options = [
    { label: 'Crash Bandicoot', value: 'crash-bandicoot' },
    { label: 'The Last of Us', value: 'the-last-of-us' },
    { label: 'Ghost of Tsushima', value: 'ghost-of-tsushima' },
  ]

  // Controls declared on the story rather than the variant, so both variants
  // share one set. The state is still poveste's, not the component's.
  const initState = () => ({
    text: 'Hello',
    checkbox: false,
    number: 20,
    longText: 'Longer text...',
    select: 'crash-bandicoot',
    colorselect: '#000000',
  })
</script>

<Hst.Story title="Shared Controls" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.text} title="HstText" />
    <Hst.Checkbox bind:value={state.checkbox} title="HstCheckbox" />
    <Hst.Number bind:value={state.number} title="HstNumber" />
    <Hst.Textarea bind:value={state.longText} title="HstTextarea" />
    <Hst.Select bind:value={state.select} title="HstSelect" {options} />
    <Hst.ColorSelect bind:value={state.colorselect} title="HstColorSelect" />
  {/snippet}

  <Hst.Variant title="variant 1">
    {#snippet children({ state })}
      <h1>Variant 1</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="variant 2">
    {#snippet children({ state })}
      <h1>Variant 2</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
