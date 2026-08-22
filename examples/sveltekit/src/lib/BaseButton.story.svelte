<script lang="ts">
  import type { Hst, StoryState } from '@poveste/plugin-svelte'
  import { logEvent } from 'poveste/client'
  import BaseButton from './BaseButton.svelte'

  export let Hst: Hst

  const initState = () => ({
    disabled: false,
    size: 'medium',
  })

  function source(state: StoryState) {
    const attrs = state.disabled ? ' disabled' : ''
    return `<BaseButton${attrs}>Click me !</BaseButton>`
  }
</script>

<Hst.Story title="BaseButton" {initState} {source}>
  {#snippet children({ state })}
    <BaseButton disabled={state.disabled} size={state.size} on:click={event => logEvent('click', event)}>
      Click me!
    </BaseButton>
    <div style="margin-top: 6px;">
      <label>
        <input type="checkbox" bind:checked={state.disabled}>
        Disabled
      </label>
    </div>
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox
      bind:value={state.disabled}
      title="Disabled"
    />
    <Hst.Select
      bind:value={state.size}
      options={['small', 'medium', 'large']}
      title="Size"
    />
    <pre>{JSON.stringify({ disabled: state.disabled, size: state.size }, null, 2)}</pre>
  {/snippet}
</Hst.Story>

<style>
  pre {
    padding: 8px;
    background: rgba(0, 0, 0, .1);
    border-radius: 4px;
    margin: 8px;
    font-size: 0.8rem;
  }
</style>
