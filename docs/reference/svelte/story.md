---
title: 'Hst.Story — define a story in Svelte'
description: 'Every prop the Hst.Story tag takes, including title, icon, layout and the source it shows, for stories written in Svelte.'
---

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
    - `iframe`: Whether to isolate the story in an iframe. You might want to disable it if you want to pass complex parameters that can't be serialized.
  - with `type: 'grid'` you can specify:
    - `width`: Column size. Can be number (pixels) or string (like `'100%'`).
    - `iframeGrid`: Whether each grid item renders in an iframe of its own. Default `true`; `false` renders the items in the app's document. See [Grid iframes](../../guide/css.md#grid-iframes).
  - with either type:
    - `isolate`: Give every render of the story a fresh sandbox document instead of a reused one. For stories that leave JavaScript state behind (patched globals, leaked timers) that the next story must not see.

A key the layout's `type` does not read is ignored, and `poveste dev` and `poveste build` say so when they collect the story. `iframe` belongs to a single layout and `iframeGrid` to a grid, so the usual case is one written on the other:

```
⚠️  …/src/Button.story.svelte: layout.iframe is not read by a grid layout, so it does nothing: use iframeGrid
```

A `type` other than `'single'` or `'grid'` is reported the same way.

[Learn more](../../guide/svelte/stories.md#layout)

## `initState`

A function returning the initial state for the variant. Poveste owns this state, and passes it
to the `children` and `controls` snippets — it is how controls reach your component.

```svelte
<script>
  const { Hst } = $props()

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
  const { Hst } = $props()

  function setupApp({ variant }) {
    document.body.dataset.variant = variant.title
  }
</script>

<Hst.Story title="Story setup" {setupApp}>
  <MyComponent />
</Hst.Story>
```

Every variant inherits it, including explicit `<Hst.Variant>` children. A [`setupApp` on the variant](./variant.md#setupapp) overrides it for that variant.

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

The icon's data ships with the book when the book has its collection installed: `@iconify-json/lucide` for `lucide:cpu`, as a dev dependency. That holds for `poveste build` and `poveste dev`. Without the package, the icon loads from `api.iconify.design` when it first shows, so it is missing offline, and each reader's browser asks Iconify for it. The same goes for a variant's `icon`.

```svelte
<Hst.Story icon="lucide:cpu">
  Hello world
</Hst.Story>
```

## `iconColor`

The icon color.

```svelte
<Hst.Story iconColor="#8B5CF6">
  Hello world
</Hst.Story>
```

## `docsOnly`

This story will only render a documentation page — no preview, no controls, no variants.

Write the content in a sibling markdown file. Svelte has no `<docs>` block; a story file named `MarkdownLinks.story.svelte` takes its documentation from `MarkdownLinks.story.md` next to it.

```svelte
<script>
  const { Hst } = $props()
</script>

<Hst.Story group="top" docsOnly icon="carbon:bookmark" />
```

A story file that renders nothing else is the whole component. If the page has no story to attach to at all, you can drop the `.svelte` file entirely and leave just the `.story.md` — see [Documentation](../../guide/svelte/docs.md).

## `source`

The copyable source code of the story.

```svelte
<script>
  const { Hst } = $props()

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

Every variant inherits it. A variant sets [`responsiveDisabled={false}`](./variant.md#responsivedisabled) to opt out of what the story declared.

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

## `autoDocs`

The auto-docs table on this story's **Docs** tab, when the book's [`autoDocs`](../config.md#autodocs) is on. `false` shows none, and the story's components are never read for it, in dev or in a build. A list shows only the sections it names, in the table's own order: `props`, `slots`, `events`. A component with nothing in those sections gets no table. Left out, the story shows the whole table.

```svelte
<Hst.Story autoDocs={['props', 'events']}>
  <!-- ... -->
</Hst.Story>
```

It belongs to the story, not to a variant: the table lists the components the story imports.

## `meta`

`StoryMeta`, an object of your own keys plus `storyOptions`.

Free-form data attached to the story. `meta` is the book's to extend: put any key in it and read it back where your own code is handed the story, which in a Svelte book is the [setup function](../../guide/svelte/app-setup.md). Poveste itself reads one key, `storyOptions`, described below. It also writes one of its own, `hasVariantChildComponents`, so leave that name alone.

In a TypeScript book, declare your keys once, in the setup file for instance. `CommonMeta` types `meta` on both `Hst.Story` and `Hst.Variant`:

```ts
declare module 'poveste' {
  interface CommonMeta {
    /** Read by the book's own setup function. */
    theme?: 'light' | 'dark'
  }
}
```

The setup function is handed the story and the variant, so that is where a key is read. A variant's `meta` and its story's are separate objects. The function also runs once with no variant, for the mount that fills the controls panel, in the same document:

```ts
// src/poveste.setup.ts
import { defineSetupSvelte } from '@poveste/plugin-svelte'

export const setupSvelte = defineSetupSvelte(({ story, variant }) => {
  if (!variant) {
    return
  }
  document.documentElement.dataset.theme = variant.meta?.theme ?? story?.meta?.theme ?? 'light'
})
```

### `meta.storyOptions`

Overrides the **Story Options** switch in the Layout menu, for this story only. The pane that switch shows and hides is the one beside or below the preview, with the story's controls, docs, events and source.

- `false` hides the pane for this story, whatever the reader has set.
- `true` shows it, whatever the reader has set.
- Left out, the story follows the reader's setting, which starts on.

```svelte
<Hst.Story title="Dashboard" meta={{ storyOptions: false }}>
  <!-- ... -->
</Hst.Story>
```

Use it for a story with nothing to adjust, where the pane only takes room from the preview. In a Svelte book it needs Poveste 0.19.0 or later: earlier versions dropped a story's `meta`, so the key did nothing ([#1206](https://github.com/poveste-dev/poveste/issues/1206)).

## Snippet: `controls`

Content of the 'Controls' pane used to interact with the story, passed as a `controls` snippet that receives the state. This will be the default content for variants of the story but you can override it by defining a `controls` snippet in a variant.

```svelte
<Hst.Story>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
  {/snippet}

  <Hst.Variant>
    <!-- Controls reused here -->
  </Hst.Variant>
</Hst.Story>
```

[Learn more](../../guide/svelte/controls.md#controls-panel)
