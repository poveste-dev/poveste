<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({
    text: 'Click me',
    disabled: false,
    size: 'medium',
  })
</script>

<Hst.Story id="conformance-button" title="Conformance/Button" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.text} title="Text" />
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
    <Hst.Select bind:value={state.size} options={['small', 'medium', 'large']} title="Size" />
  {/snippet}

  <Hst.Variant id="default" title="default">
    {#snippet children({ state })}
      <button class="conformance-button" disabled={state.disabled}>{state.text}</button>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
