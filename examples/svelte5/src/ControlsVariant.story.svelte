<script>
  import BaseButton from './BaseButton.svelte'

  export let Hst
</script>

<Hst.Story>
  <Hst.Variant
    title="Variant 1"
    initState={() => ({ disabled: false, content: 'Hello world' })}
    let:state
  >
    <BaseButton disabled={state.disabled}>
      {state.content} 1
    </BaseButton>

    <svelte:fragment slot="controls" let:state>
      <Hst.Text bind:value={state.content} title="Content 1" />
      <Hst.Checkbox bind:value={state.disabled} title="Disabled 1" />
    </svelte:fragment>
  </Hst.Variant>

  <Hst.Variant
    title="Variant 2"
    initState={() => ({ disabled: false, content: 'Hello world' })}
    let:state
  >
    <BaseButton disabled={state.disabled}>
      {state.content} 2
    </BaseButton>

    <svelte:fragment slot="controls" let:state>
      <Hst.Text bind:value={state.content} title="Content 2" />
      <Hst.Checkbox bind:value={state.disabled} title="Disabled 2" />
    </svelte:fragment>
  </Hst.Variant>
</Hst.Story>
