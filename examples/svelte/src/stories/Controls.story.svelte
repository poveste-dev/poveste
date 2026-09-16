<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const options = {
    'crash-bandicoot': 'Crash Bandicoot',
    'the-last-of-us': 'The Last of Us',
    'ghost-of-tsushima': 'Ghost of Tsushima',
  }

  const radioOptions = {
    'death-stranding': 'Death Stranding',
    'metal-gear': 'Metal Gear',
    'elden-ring': 'Elden Ring',
  }

  const initState = () => ({
    text: 'Hello',
    checkbox: false,
    number: 20,
    longText: 'Longer text...',
    select: 'crash-bandicoot',
    colorselect: '#000000',
    radio: 'metal-gear',
    object: { foo: 'bar' },
  })
</script>

<Hst.Story title="Controls">
  <Hst.Variant title="default" initState={initState}>
    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="HstText" />
      <Hst.Checkbox bind:value={state.checkbox} title="HstCheckbox" />
      <Hst.Number bind:value={state.number} title="HstNumber" />
      <Hst.Slider bind:value={state.number} min={0} max={100} title="HstNumber" />
      <Hst.Textarea bind:value={state.longText} title="HstTextarea" />
      <Hst.Select bind:value={state.select} title="HstSelect" {options} />
      <Hst.ColorSelect bind:value={state.colorselect} title="HstColorSelect" />
      <Hst.Radio bind:value={state.radio} title="HstRadio" options={radioOptions} />
      <Hst.Json bind:value={state.object} title="HstJson" />
    {/snippet}

    {#snippet children({ state })}
      <h1>State</h1>
      <pre class="state-output">{JSON.stringify(state, null, 2)}</pre>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
