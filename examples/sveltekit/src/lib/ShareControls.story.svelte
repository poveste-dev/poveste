<script>
  import BaseButton from './BaseButton.svelte'

  export let Hst

  const initState = () => ({
    disabled: false,
    content: 'Hello world',
  })
</script>

<Hst.Story {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.content} title="Content" />
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  {/snippet}

  <Hst.Variant title="Variant 1">
    {#snippet children({ state })}
      <BaseButton disabled={state.disabled}>
        {state.content}
      </BaseButton>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="Variant 2">
    {#snippet children({ state })}
      <BaseButton disabled={state.disabled}>
        {state.content}
      </BaseButton>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
