<script>
  export let Hst

  const initState = () => ({
    content: 'Some content',
  })
</script>

<Hst.Story layout={{ type: 'single', iframe: false }} {initState}>
  {#snippet children({ state })}
    No iframe story content

    <div>{state.content}</div>
    <div>
      <input bind:value={state.content} />
    </div>
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Text
      bind:value={state.content}
      title="Content"
    />
  {/snippet}
</Hst.Story>

<style>
  div {
    margin-top: 8px;
  }

  input {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 2px 4px;
  }
</style>
