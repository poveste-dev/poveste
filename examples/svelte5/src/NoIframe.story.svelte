<script>
  export let Hst
</script>

<Hst.Story
  layout={{ type: 'single', iframe: false }}
  initState={() => ({ content: 'Some content' })}
  let:state
>
  No iframe story content

  <div>{state.content}</div>
  <div>
    <input bind:value={state.content} />
  </div>

  <svelte:fragment slot="controls" let:state>
    <Hst.Text
      bind:value={state.content}
      title="Content"
    />
  </svelte:fragment>
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
