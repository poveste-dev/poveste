# State & Controls

Controls give you the ability to interact with your components arguments.

## Defining state

Declare the state with `initState` on `<Hst.Variant>` (or `<Hst.Story>`), and read it from the
`state` your content receives. It is an ordinary prop, so it belongs in your `<script>`:

```svelte{6-9,13,15,17,20}
<script>
  import MyButton from './MyButton.svelte'

  export let Hst

  const initState = () => ({
    disabled: false,
    content: 'Click me!',
  })
</script>

<Hst.Story>
  <Hst.Variant {initState}>
    {#snippet children({ state })}
      <MyButton disabled={state.disabled}>
        {state.content}
      </MyButton>

      <input bind:value={state.content}>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

`initState` is a function rather than an object because every variant gets its own copy.

::: warning State cannot live in a component variable
A `let disabled = false` in your story will **not** work, even though it looks like it should.

Poveste mounts your story once per slot — the app renders it to fill the controls panel, the
preview renders it to show the story — so a component-local variable exists twice. A control
writes to one copy while your component reads the other, and nothing appears to happen.

Svelte 4 papered over this by capturing one instance's internals and injecting them into the
other. Svelte 5 removed that, deliberately: component internals are private. So Poveste owns the
state instead, which is also what lets it cross the sandbox iframe.

A story that has controls but no `initState` logs an error in the console saying exactly this.
:::

Values that are genuinely local — a `bind:this` node, a DOM ref — should stay in the component.
Only what your controls drive needs to be state.

## Controls panel

To create the control panel, Poveste provides a `controls` snippet on `<Hst.Variant>` (and
`<Hst.Story>`, more on that later). You are free to render any element or components inside it,
and it receives the same `state`.

```svelte{18-21}
<script>
  import MyButton from './MyButton.svelte'

  export let Hst

  const initState = () => ({
    disabled: false,
    content: 'Hello world',
  })
</script>

<Hst.Story>
  <Hst.Variant {initState}>
    {#snippet children({ state })}
      <MyButton disabled={state.disabled}>
        {state.content}
      </MyButton>
    {/snippet}

    {#snippet controls({ state })}
      Content: <input type="text" bind:value={state.content} />
      Disabled: <input type="checkbox" bind:checked={state.disabled} />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

You can also share the same default controls for all variants by putting the snippet directly
under the `<Hst.Story>` component, with the state declared there too:

```svelte{2-5}
<Hst.Story {initState}>
  {#snippet controls({ state })}
    Content: <input type="text" bind:value={state.content} />
    Disabled: <input type="checkbox" bind:checked={state.disabled} />
  {/snippet}

  <Hst.Variant title="Variant 1">
    {#snippet children({ state })}
      <MyButton disabled={state.disabled}>
        {state.content}
      </MyButton>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant title="Variant 2">
    {#snippet children({ state })}
      <MyButton disabled={state.disabled}>
        {state.content}
      </MyButton>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

A variant can then override the snippet if needed.

Note that the state is still per variant: shared controls drive whichever variant you are
looking at, and each keeps its own values. Only variant state crosses the sandbox iframe, so
there is no story-wide bucket to share.

## Source code from state

The source panel shows the `source` prop. Because props are evaluated in your `<script>`, where
`state` is not in scope, a plain string cannot follow the controls — pass a function instead:

```svelte
<script lang="ts">
  import type { Hst, StoryState } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ disabled: false })

  function source(state: StoryState) {
    const attrs = state.disabled ? ' disabled' : ''
    return `<MyButton${attrs}>Click me !</MyButton>`
  }
</script>

<Hst.Story {initState} {source}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled}>Click me !</MyButton>
  {/snippet}
</Hst.Story>
```

## Automatic controls

Poveste reads the props a component declares and builds a control for each one,
so a variant that renders a component needs nothing written for it to be
adjustable:

```svelte
<Hst.Variant title="Naked">
  <MyButton />
</Hst.Variant>
```

The panel lists `MyButton`'s props, and editing one re-renders it. A prop the
story binds itself keeps its own value until you touch that control.

Set [`autoPropsDisabled`](../../reference/svelte/story.md#autopropsdisabled) to
turn this off for a story or a variant.

Unlike Vue, which reads props off the rendered component, Poveste reads a Svelte
component's props **out of its source** when the book is built — Svelte has no
runtime prop metadata to reflect over. That is why the table below is about what
can be seen in the file.

### What it can read

| declaration | control |
| --- | --- |
| `export let label: string = 'x'` | from the type |
| `export let label: string` | from the type |
| `export let label = 'x'` | from the default |
| `let { label }: { label: string } = $props()` | from the type |
| `let { label }: Props = $props()`, `Props` declared in the same file | from the type |
| `let { label = 'x' } = $props()` | from the default |
| `let { label = $bindable('x') } = $props()` | from the default |
| `let { label }: Props = $props()`, `Props` **imported** | nothing — see below |

### An imported type is not followed

Props typed by an `interface` or `type` **imported from another file** produce no
controls, because the reader only resolves types declared in the component it is
reading:

```svelte
<script lang="ts">
  import type { Props } from './types' // not followed

  const { label }: Props = $props()
</script>

{label}
```

This is a real limitation rather than something you did wrong, and it is tracked
in [#501](https://github.com/poveste-dev/poveste/issues/501). Until it is fixed,
declaring the type in the component, or giving the prop a default, gets the
controls back.

### When you get a JSON editor instead

A prop with **no type, no default and nothing passed by the story** gets the JSON
editor. That is deliberate rather than a gap: with nothing to go on, guessing
would pick a control the prop cannot hold, and a text field on a prop that wants
an object invites you to type something the component will reject.

The fix is to give it something to read — a default on the prop, or a value in
the story:

A default the reader can see:

```
let { label }: Props = $props()        // no control
let { label = 'Click me' } = $props()  // text field
```

Or a value in the story:

```svelte
<MyButton label="Click me" />
```

## Builtin controls

To build a control panel a bit more easily, Poveste provides builtin controls with design that
fits the rest of the UI.

```svelte{19-20}
<script>
  import MyButton from './MyButton.svelte'

  export let Hst

  const initState = () => ({
    disabled: false,
    content: 'Hello world',
  })
</script>

<Hst.Story>
  <Hst.Variant {initState}>
    {#snippet children({ state })}
      <MyButton disabled={state.disabled}>
        {state.content}
      </MyButton>
    {/snippet}

    {#snippet controls({ state })}
      <Hst.Text bind:value={state.content} title="Content" />
      <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

Check out all the available controls in the [`@poveste/controls` package](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-controls).
