<script>
  import BaseButton from './BaseButton.svelte'

  export let Hst

  const initState = () => ({
    disabled: false,
    content: 'Hello world',
  })
</script>

<Hst.Story>
  <Hst.Variant title="Variant 1" {initState}>
    {#snippet children({ state })}
      <BaseButton disabled={state.disabled}>
        {state.content} 1
      </BaseButton>
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.content} title="Content 1" />
      <Hst.Checkbox bind:value={state.disabled} title="Disabled 1" />
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="Variant 2" {initState}>
    {#snippet children({ state })}
      <BaseButton disabled={state.disabled}>
        {state.content} 2
      </BaseButton>
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.content} title="Content 2" />
      <Hst.Checkbox bind:value={state.disabled} title="Disabled 2" />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
