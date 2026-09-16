<script>
  export let Hst

  // Deliberately NOT migrated to `initState`. This is the pre-#81 shape: state
  // in a component local, bound from a control. It renders, and the control even
  // moves, but the edit never reaches the story body — the story is mounted once
  // per slot, so this `disabled` exists twice.
  //
  // Kept as a fixture so the loud warning has something to fire on, and so the
  // failure mode itself stays visible rather than being remembered wrongly.
  let disabled = false
</script>

<Hst.Story title="UnmigratedState">
  <button {disabled}>
    Hello Poveste
  </button>

  <svelte:fragment slot="controls">
    <Hst.Checkbox
      bind:value={disabled}
      title="Disabled"
    />
  </svelte:fragment>
</Hst.Story>
