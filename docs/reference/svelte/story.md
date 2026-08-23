# Hst.Story

Create a story. Must be at the top level of the story file.

## `title`

Title of the story.

```svelte
<Hst.Story title="My story">
  Hello world
</Hst.Story>
```

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

## `source`

The copyable source code of the story.

```svelte
<script>
  export let Hst

  const source = `<h1>Toto</h1>

<input
  v-model.number="count"
  type="number"
>`
</script>

<Hst.Story {source}>
  <!-- ... -->
</Hst.Story>
```

## `responsiveDisabled`

Disables the responsive menu, preview resize handles and makes the preview laways fit the available space.

```svelte
<Hst.Story responsiveDisabled>
  <!-- ... -->
</Hst.Story>
```

## `autoPropsDisabled`

Disables the automatic detection of props of the components in the story.

```svelte
<Hst.Story autoPropsDisabled>
  <!-- ... -->
</Hst.Story>
```

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
