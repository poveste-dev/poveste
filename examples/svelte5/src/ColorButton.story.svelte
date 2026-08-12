<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import { logEvent } from 'poveste/client'
  import ColorButton from './ColorButton.svelte'

  export let Hst: Hst
</script>

<Hst.Story
  title="ColorButton"
  source="<ColorButton>Click me !</ColorButton>"
  initState={() => ({ disabled: false, size: 'medium', colorselect: '#000000' })}
  let:state
>
  <ColorButton disabled={state.disabled} colorselect={state.colorselect} on:click={event => logEvent('click', event)}>
    Click me!
  </ColorButton>
  <div style="margin-top: 6px;">
    <label>
      <input type="checkbox" bind:checked={state.disabled}>
      Disabled
    </label>
  </div>

  <svelte:fragment slot="controls" let:state>
    <Hst.Checkbox
      bind:value={state.disabled}
      title="Disabled"
    />
    <Hst.Select
      bind:value={state.size}
      options={['small', 'medium', 'large']}
      title="Size"
    />
    <Hst.ColorSelect
      bind:value={state.colorselect}
      title="Background Color"
    />
    <pre>{JSON.stringify({ disabled: state.disabled, size: state.size }, null, 2)}</pre>
  </svelte:fragment>
</Hst.Story>

<style>
  pre {
    padding: 8px;
    background: rgba(0, 0, 0, .1);
    border-radius: 4px;
    margin: 8px;
    font-size: 0.8rem;
  }
</style>
