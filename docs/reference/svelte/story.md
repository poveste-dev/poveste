# Hst.Story

Create a story. Must be at the top level of the story file.

## `title`

Title of the story.

```svelte
<Hst.Story title="My story">
  Hello world
</Hst.Story>
```

## `id`

Id of the story used in the URL. By default, the id is automatically generated from the file path. Setting an id manually will ensure the URL parameter doesn't change with the order of the variants in the story.

```svelte
<Hst.Story id="my-story">
  Hello world
</Hst.Story>
```

## `layout`

Layout of the story. Object with the following properties:
  - `type`: `'single'` or `'grid'`
  - with `type: 'single'` you can specify:
    - `iframe`: Whether to isolate the story in an iframe. You might want to disable it if you want to pass complexe parameters that can't be serialized.
  - with `type: 'grid'` you can specify:
    - `width`: Column size. Can be number (pixels) or string (like `'100%'`).
  - with either type:
    - `isolate`: Give every render of the story a fresh sandbox document instead of a reused one. For stories that leave JavaScript state behind (patched globals, leaked timers) that the next story must not see.

[Learn more](../../guide/svelte/stories.md#layout)

## `initState`

A function returning the initial state for the variant. Poveste owns this state, and passes it
to the `children` and `controls` snippets — it is how controls reach your component.

```svelte
<script>
  export let Hst

  const initState = () => ({ disabled: false })
</script>

<Hst.Story {initState}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  {/snippet}
</Hst.Story>
```

A function rather than an object, because every variant gets its own copy.

State cannot live in a component-local `let`: Poveste mounts the story once per slot, so such a
variable exists twice and a control writes to a different copy than your markup reads. A story
with a controls slot and no `initState` logs an error saying so. See
[State & Controls](../../guide/svelte/controls.md) and, if you are coming from histoire,
[the migration note](../../guide/migration-from-histoire.md#svelte-story-state-moves-to-initstate).

## `setupApp`

A function to configure the Svelte app, called after the global setup hook with the same argument.

It receives a payload object with the following properties:

- `app`: The mounted story component instance.
- `story`: The story object.
- `variant`: The variant object.

```svelte
<script>
  export let Hst

  function setupApp({ variant }) {
    document.body.dataset.variant = variant.title
  }
</script>

<Hst.Story title="Story setup" {setupApp}>
  <MyComponent />
</Hst.Story>
```

::: warning Not inherited by explicit variants
In Vue, a `setup-app` on `<Story>` gives every `<Variant>` a default. In Svelte it does not: a `setupApp` here reaches only the implicit variant of a story that declares no `<Hst.Variant>` children — as the example above does. As soon as you write explicit variants, put [`setupApp`](./variant.md#setupapp) on each variant that needs it.
:::

[Learn more](../../guide/svelte/app-setup.md#local-setup)

## `group`

The id of a group to include the story in.

```svelte
<Hst.Story group="my-group">
  Hello world
</Hst.Story>
```

[Learn more](../../guide/svelte/hierarchy.md#groups)

## `icon`

An [Iconify id](https://icones.js.org/) to customize the story icon in the tree.

```svelte
<Hst.Story icon="lucide:cpu">
  Hello world
</Hst.Story>
```

## `iconColor`

The icon color.

```svelte
<Hst.Story icon-color="#8B5CF6">
  Hello world
</Hst.Story>
```

## `docsOnly`

This story will only render a documentation page — no preview, no controls, no variants.

Write the content in a sibling markdown file. Svelte has no `<docs>` block; a story file named `MarkdownLinks.story.svelte` takes its documentation from `MarkdownLinks.story.md` next to it.

```svelte
<script>
  export let Hst
</script>

<Hst.Story group="top" docsOnly icon="carbon:bookmark" />
```

A story file that renders nothing else is the whole component. If the page has no story to attach to at all, you can drop the `.svelte` file entirely and leave just the `.story.md` — see [Documentation](../../guide/svelte/docs.md).

## `source`

The copyable source code of the story.

```svelte
<script>
  export let Hst

  const source = `<h1>Toto</h1>

<input
  bind:value={count}
  type="number"
>`
</script>

<Hst.Story {source}>
  <!-- ... -->
</Hst.Story>
```

## `responsiveDisabled`

Disables the responsive menu, preview resize handles and makes the preview always fit the available space.

```svelte
<Hst.Story responsiveDisabled>
  <!-- ... -->
</Hst.Story>
```

::: warning Not inherited by explicit variants
Like [`setupApp`](#setupapp), this reaches only the implicit variant of a story that declares no `<Hst.Variant>` children. Write it on [each variant](./variant.md#responsivedisabled) instead once the story has explicit ones. Tracked in [#466](https://github.com/poveste-dev/poveste/issues/466).
:::

## `autoPropsDisabled`

Turns off automatic prop detection for the story.

Poveste reads the props a component declares and builds a control for each one, so a variant that renders a component needs nothing written for it to be adjustable:

```svelte
<Hst.Variant title="Naked">
  <Button />
</Hst.Variant>
```

The controls panel lists `Button`'s props, and editing one re-renders the component with the new value. A prop the story binds itself keeps its own value until that control is used:

```svelte
<Hst.Variant title="State" {initState}>
  {#snippet children({ state })}
    <Button label={state.label} />
  {/snippet}
</Hst.Variant>
```

Set `autoPropsDisabled` to stop this for every variant in the story:

```svelte
<Hst.Story autoPropsDisabled>
  <!-- ... -->
</Hst.Story>
```

::: tip How it works, and what it needs
Vue reads props off the vnodes a variant is about to render. A Svelte component renders straight to the DOM, so there is no such tree — Poveste reads the props out of the component's own source when the book is built, and gives each component in a variant the values its controls hold ([#233](https://github.com/poveste-dev/poveste/issues/233)).

That means it covers components the story imports and renders directly. A component behind `{#if}` or `{#each}`, or one reached through `<svelte:component>`, is skipped — which component renders is only known once the story runs, and a control pointed at the wrong one is worse than no control. The variant's other components keep their controls.

A story that declares a **variant** inside `{#if}`, `{#each}` or `{#await}` gets no auto-props at all. Those variants are registered in an order nothing can predict before the story runs, so the whole story is left alone rather than risk driving the wrong one.
:::

## Slot: `controls`

Content of the 'Controls' pane used to interact with the story. This will be the default content for variants of the story but you can override it by defining a `controls` slot in a variant.

```svelte
<Hst.Story>
  <svelte:fragment slot="controls">
    <!-- Interact with state here -->
  </svelte:fragment>

  <Hst.Variant>
    <!-- Controls reused here -->
  </Hst.Variant>
</Hst.Story>
```

[Learn more](../../guide/vue/controls.md#controls-panel)
