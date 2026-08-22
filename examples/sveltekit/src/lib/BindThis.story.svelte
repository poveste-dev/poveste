<script>
  export let Hst

  // Deliberately still a component local: `bind:this` is a DOM node, which is
  // neither serialisable nor shared across mounts. Only the control-driven value
  // moves onto the variant state.
  let button

  const initState = () => ({
    disabled: false,
  })
</script>

<Hst.Story title="BindThisVsControls" {initState}>
  {#snippet children({ state })}
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
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox
      bind:value={state.disabled}
      title="Disabled"
    />
  {/snippet}
</Hst.Story>
