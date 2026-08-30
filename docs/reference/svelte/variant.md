# Hst.Variant

Create different sub stories around the same component by using the `<Hst.Variant>` tag multiple times inside the same `<Hst.Story>` tag.

## `title`

Title of the variant.

```svelte
<Hst.Story title="Cars">
  <Hst.Variant title="default">
    🚗
  </Hst.Variant>
  <Hst.Variant title="Fast">
    🏎️
  </Hst.Variant>
  <Hst.Variant title="Slow">
    🚜
  </Hst.Variant>
</Hst.Story>
```

## `id`

Id of the variant used in the URL. By default, the id is automatically generated with the index of the variant in the list. Setting an id manually will ensure the URL parameter doesn't change with the order of the variants in the story.

```svelte
<Hst.Story>
  <Hst.Variant id="default">
    🚗
  </Hst.Variant>
  <Hst.Variant id="fast">
    🏎️
  </Hst.Variant>
  <Hst.Variant id="slow">
    🚜
  </Hst.Variant>
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

<Hst.Variant {initState}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  {/snippet}
</Hst.Variant>
```

A function rather than an object, because every variant gets its own copy.

State cannot live in a component-local `let`: Poveste mounts the story once per slot, so such a
variable exists twice and a control writes to a different copy than your markup reads. A story
with a controls slot and no `initState` logs an error saying so. See
[State & Controls](../../guide/svelte/controls.md) and, if you are coming from histoire,
[the migration note](../../guide/migration-from-histoire.md#svelte-story-state-moves-to-initstate).

## `setupApp`

A function to configure the Svelte app for this variant, called after the global setup hook with the same argument.

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

<Hst.Story title="Story setup">
  <Hst.Variant title="Local setup" {setupApp}>
    <MyComponent />
  </Hst.Variant>
</Hst.Story>
```

Put it on every variant that needs it. Unlike Vue, a `setupApp` on [`Hst.Story`](./story.md#setupapp) is not inherited by explicit variants.

[Learn more](../../guide/svelte/app-setup.md#local-setup)

## `icon`

An [Iconify id](https://icones.js.org/) to customize the variant icon in the UI.

```svelte
<Hst.Story>
  <Hst.Variant icon="lucide:car">
    🚗
  </Hst.Variant>
</Hst.Story>
```

## `iconColor`

The icon color.

```svelte
<Hst.Story>
  <Hst.Variant icon-color="#8B5CF6">
    🚗
  </Hst.Variant>
</Hst.Story>
```

## `source`

The copyable source code of the variant.

```svelte
<script>
  export let Hst

  const source = `<h1>Toto</h1>

<input
  v-model.number="count"
  type="number"
>`
</script>

<Hst.Story>
  <Hst.Variant {source}>
    <!-- ... -->
  </Hst.Variant>
</Hst.Story>
```

## `responsiveDisabled`

Disables the responsive menu, preview resize handles and makes the preview always fit the available space.

```svelte
<Hst.Story>
  <Hst.Variant responsiveDisabled>
    <!-- ... -->
  </Hst.Variant>
</Hst.Story>
```

## `autoPropsDisabled`

Turns off [automatic prop detection](./story.md#autopropsdisabled) for this variant, leaving the rest of the story's variants alone.

```svelte
<Hst.Variant autoPropsDisabled>
  <Button />
</Hst.Variant>
```

## Slot: `default`

Content of the variant.

```svelte
<Hst.Story>
  <Hst.Variant>
    <MyComponent {disabled} />
  </Hst.Variant>
</Hst.Story>
```

Unlike the Vue plugin, the Svelte slot receives no slot props — bind your own
component state in the story's `<script>` and pass it down.

## Slot: `controls`

Content of the 'Controls' pane used to interact with the story.

```svelte
<Hst.Story>
  <Hst.Variant>
    <svelte:fragment slot="controls">
      <!-- Interact with state here -->
    </svelte:fragment>
  </Hst.Variant>
</Hst.Story>
```

[Learn more](../../guide/svelte/controls.md#controls-panel)
