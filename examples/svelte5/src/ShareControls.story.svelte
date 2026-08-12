<script>
  import BaseButton from './BaseButton.svelte'

  export let Hst
</script>

<Hst.Story initState={() => ({ disabled: false, content: 'Hello world' })}>
  <svelte:fragment slot="controls" let:state>
    <Hst.Text bind:value={state.content} title="Content" />
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  </svelte:fragment>

  <Hst.Variant title="Variant 1" let:state>
    <BaseButton disabled={state.disabled}>
      {state.content}
    </BaseButton>
  </Hst.Variant>

  <Hst.Variant title="Variant 2" let:state>
    <BaseButton disabled={state.disabled}>
      {state.content}
    </BaseButton>
  </Hst.Variant>
</Hst.Story>
