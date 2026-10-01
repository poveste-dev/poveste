---
title: 'How to write stories in Svelte'
description: 'The shape of a Svelte story file, where Poveste looks for one, and how a story becomes an entry in the book.'
---

# How to write stories?

Stories are svelte files ending with `.story.svelte`. Add a `Hst` prop so poveste can provide its builtin components. You then need to use the `<Hst.Story>` tag at the root of your template.

```svelte
<!-- Meow.story.svelte -->
<script>
  const { Hst } = $props()
</script>

<Hst.Story>
  🐱
</Hst.Story>
```

::: tip Runes mode, and why the examples use `$props()`
`const { Hst } = $props()` is the runes form, and it is the one declaration that compiles in **either** kind of project — which is why every example on this page uses it.

A project scaffolded by the current `sv create` is in runes mode: it sets `compilerOptions.runes` in `vite.config.ts` for every file outside `node_modules`. There `export let Hst` is a hard compile error — `Cannot use \`export let\` in runes mode` — so a story written the older way does not build.

**Using a rune puts the whole file in runes mode**, even in a project that has not opted in, so the rest of that story file has to be runes too. In practice a story declares `Hst` and an `initState` and nothing else, and both are fine. But if the file also uses `$:` or `$$props`, those stop compiling when you change the declaration — `$:` becomes `$derived` or `$effect`, and `$$props` has no equivalent you want in a story.

So `export let Hst` is still correct in a project that has not opted in, and an existing story that works needs no rewriting. Change the declaration when you are ready to make the file runes, or when your project has opted in and you have no choice.
:::

::: tip
We use a prop instead of an import because Poveste provides different implementations of those components in different situations (for example when collecting the stories).
:::

The title of the story is provided with the (optional) `title` prop:

```svelte
<script>
  const { Hst } = $props()
</script>

<Hst.Story title="🐱 Meow">
  🐱
</Hst.Story>
```

You can of course add `<script>` sections just like you would with any `.svelte` file.

For example, you will usually import and use a component in your story:

```svelte{2,7}
<script>
  import Meow from './Meow.svelte'
  const { Hst } = $props()
</script>

<Hst.Story>
  <Meow/>
</Hst.Story>
```

## TypeScript

To get typings for the `Hst` prop, you can import the `Hst` type from `@poveste/plugin-svelte`:

```svelte
<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story> <!-- Typed! -->
  🐱
</Hst.Story>
```

## Variants

Stories can have different variants representing the same component. You can define variants using the `<Hst.Variant>` tag. Similar to the story, you can provide a title to your variant with the `title` prop.

```svelte{6-14}
<script>
  const { Hst } = $props()
</script>

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

## Layout

You can change the layout of the variant by using the `layout` prop with an object. The `type` property is required to specify which layout to use.

### Single layout

This is the default layout, displaying one variant at a time. The default behavior is to isolate the story with an iframe.

Additional `layout` properties:
- `iframe`: (default: `true`) enables the iframe, useful when your CSS has media queries for responsive design.

```svelte{7}
<script>
  const { Hst } = $props()
</script>

<Hst.Story
  title="Cars"
  layout={{ type: 'single', iframe: true }}
>
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

### Grid layout

Display all the variants in a grid.

Additional `layout` properties:
- `width`: Column size. Can be number (pixels) or string (like `'100%'`).
- `isolate`: Give every render of this story a fresh sandbox document instead of reusing a warm one. Sandboxes are pooled by default — a cell or the single preview is handed the next variant to show rather than reloaded — so a story that leaves JavaScript state behind (patched globals, leaked timers) that the next story must not see can opt out with `isolate: true`. Style isolation is the same either way.

```svelte{7}
<script>
  const { Hst } = $props()
</script>

<Hst.Story
  title="Cars"
  layout={{ type: 'grid', width: 200 }}
>
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
