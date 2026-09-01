# Controlled stories

These patterns let you create custom controls to update your component.

Svelte state works differently from Vue here, and it is the difference worth learning first. There is no `reactive()` object in module scope: you give the story an `initState` function, and Poveste hands the resulting state back to each snippet as `{ state }`. See [stories](../../guide/svelte/stories.md) for the reasoning.

## Single control

This will display a control panel for the story.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const initState = () => ({
    text: 'Hello world',
  })
</script>

<Hst.Story title="MyStory" {initState}>
  {#snippet children({ state })}
    <MyComponent argument={state.text} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Text bind:value={state.text} title="Content" />
  {/snippet}
</Hst.Story>
```

The controls are a `controls` snippet rather than a named slot, and they bind with `bind:value` rather than `v-model`.

## Global variant control

This will display a control panel for all the variants.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const initState = () => ({
    text: 'Hello world',
  })
</script>

<Hst.Story title="MyStory" {initState}>
  <Hst.Variant title="MyVariant Red">
    {#snippet children({ state })}
      <MyComponent argument={state.text} color="red" />
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="MyVariant Blue">
    {#snippet children({ state })}
      <MyComponent argument={state.text} color="blue" />
    {/snippet}
  </Hst.Variant>

  {#snippet controls({ state })}
    <Hst.Text bind:value={state.text} title="Content" />
  {/snippet}
</Hst.Story>
```

## Specific variant control

This will display a control panel only for one variant.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const initState = () => ({
    text: 'Hello world',
  })
</script>

<Hst.Story title="MyStory" {initState}>
  <Hst.Variant title="MyVariant Red">
    {#snippet children({ state })}
      <MyComponent argument={state.text} color="red" />
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="Content" />
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="MyVariant Blue">
    <MyComponent argument="hello" color="blue" />
  </Hst.Variant>
</Hst.Story>
```

A variant with nothing to read from state does not need the `children` snippet at all — plain children work, as in the Blue variant above.

## Isolated variant control

This will isolate each variant so that you control only one variant at a time. Put `initState` on each variant instead of on the story.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const initState = () => ({
    text: 'Hello world',
  })
</script>

<Hst.Story title="MyStory">
  <Hst.Variant title="MyVariant Red" {initState}>
    {#snippet children({ state })}
      <MyComponent argument={state.text} color="red" />
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="Content" />
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="MyVariant Blue" {initState}>
    {#snippet children({ state })}
      <MyComponent argument={state.text} color="blue" />
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.text} title="Content" />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

Each variant calls `initState` for itself, so editing Red's text leaves Blue's alone.

## Available controls

`Hst.Text`, `Hst.Textarea`, `Hst.Number`, `Hst.Checkbox`, `Hst.CheckboxList`, `Hst.Select`, `Hst.Radio`, `Hst.ButtonGroup`, `Hst.Slider`, `Hst.Json`, `Hst.ColorSelect` and `Hst.Button` — reached through the `Hst` prop rather than as globals. Note `ColorSelect`, not `Color`. See [controls](../../guide/svelte/controls.md).
