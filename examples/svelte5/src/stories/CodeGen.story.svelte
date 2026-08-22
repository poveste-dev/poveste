<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import BaseButton from '../BaseButton.svelte'

  export let Hst: Hst

  // What the source panel generates is per-plugin: the Vue book asserts Vue
  // markup, this one asserts Svelte. Same purpose, necessarily different output,
  // which is exactly why it could not be a shared story with one expectation.
  const initState = () => ({ count: 0, text: 'Foo', object: { foo: 'bar' } })
</script>

<Hst.Story title="Code gen" icon="carbon:code" iconColor="#8B5CF6">
  <Hst.Variant id="html" title="html" icon="carbon:code" {initState}>
    {#snippet children({ state })}
      <h1>Title</h1>
      <hr />
      <pre>{JSON.stringify({ object: state.object }, null, 2)}</pre>
      <div data-testid="object">{state.object.foo}</div>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant id="components" title="components" {initState}>
    {#snippet children({ state })}
      <BaseButton>Click me {state.count}</BaseButton>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant id="bindings" title="bindings" {initState}>
    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="text" />
    {/snippet}

    {#snippet children({ state })}
      <input bind:value={state.text} />
      <p>{state.text}</p>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
