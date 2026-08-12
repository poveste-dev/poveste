<script>
  export let Hst

  // Deliberately still a component local: `bind:this` is a DOM node, which is
  // neither serialisable nor shared across mounts. Only the control-driven value
  // moves onto the variant state.
  let button
</script>

<Hst.Story
  title="BindThisVsControls"
  initState={() => ({ disabled: false })}
  let:state
>
  <button bind:this={button} disabled={state.disabled}>
    Hello Poveste
  </button>

  <section>
    button={button}
  </section>

  <label>
    <input
      type="checkbox"
      bind:checked={state.disabled}
    />
    Disabled
  </label>

  <svelte:fragment slot="controls" let:state>
    <Hst.Checkbox
      bind:value={state.disabled}
      title="Disabled"
    />
  </svelte:fragment>
</Hst.Story>
