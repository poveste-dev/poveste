---
title: 'Documentation in Svelte — markdown beside a story'
description: 'Write markdown documentation alongside a Svelte story so the book explains the component as well as showing it.'
---

# Documentation

## Markdown

### No `<docs>` block

**Not supported.** The Vue plugin lets a story carry its documentation inline in a
[`<docs>` custom block](../vue/docs.md#custom-block). Svelte has no SFC custom-block
mechanism for a plugin to hook, so there is nothing to mirror, and this plugin does not
provide an equivalent.

Use a sibling `.story.md` file instead — it is the documented Svelte answer, not a
workaround for a missing feature, and it is what the example books use.

This is tracked in [#529](https://github.com/poveste-dev/poveste/issues/529), which is about
saying so here rather than about building the block: given there is no custom-block mechanism
to mirror, the sibling file may simply be the better Svelte answer.

### Sibling markdown

To add documentation to a story, create a file with the same name next to it, with the `.md` extension.

For example, if your story is `BaseButton.story.svelte`, create a `BaseButton.story.md` file.

### Standalone page

If you create a markdown file ending with `.story.md` that isn't related to a sibling story file, it will automatically create a virtual story that renders the markdown as a page.

You can add a frontmatter to the markdown to customize the virtual story with the following properties:

- `id` ([reference](../../reference/svelte/story.md#id))
- `title` ([reference](../../reference/svelte/story.md#title))
- `icon` ([reference](../../reference/svelte/story.md#icon))
- `iconColor` ([reference](../../reference/svelte/story.md#iconcolor))
- `group` ([reference](../../reference/svelte/story.md#group))

Example `Introduction.story.md` file:

```md
---
group: 'top'
icon: 'carbon:bookmark'
---

# Welcome

This is a demo book using Svelte.

---

Learn more about Poveste [here](https://poveste.dev/).
```

### Links

You can link to other stories using a relative path to the story file:

```md
- [Go to Story](./BaseButton.story.svelte)
- [Go to CodeGen > Slots](./CodeGen.story.svelte?variantId=slots)
- [Go to Markdown file](./MarkdownFile.story.md)
```

### Types on hover

A TypeScript or JavaScript block marked `twoslash` is compiled when the book renders it, and shows each name's type when the reader hovers it, as [Twoslash](https://twoslash.netlify.app) does on a VitePress site. From the keyboard, the block is one Tab stop and the arrow keys move between its names:

````md
```ts twoslash
type Size = 'sm' | 'md' | 'lg'

const size: Size = 'md'
```
````

It compiles with the TypeScript 6 Poveste installs for auto-docs, so the book needs nothing more, whatever TypeScript it has. Each block compiles on its own, with TypeScript's defaults rather than the book's tsconfig: an import from a package the book installs resolves, but one through a `paths` alias such as `@/`, or of a `.vue` or `.svelte` file, does not. In a book that installs TypeScript 7 with npm, `npm ls` reports `typescript` as invalid, because Twoslash asks for TypeScript 5 or 6 beside it: that is expected, and the blocks still compile with Poveste's copy. A block that does not compile renders as plain code too, and the log names its file and line: it never fails a build. Unmarked blocks are unchanged, and nothing is loaded for a book that marks none.

A block with types wraps its long lines rather than scrolling them, so a type's popup is not cut off at the edge.

## Component docs

The docs tab shows a props, slots and events table for each component a story imports, read from the type on its `$props()` the way your editor reads it: through an imported `Props`, the interfaces it extends, and `$lib` paths. Descriptions and tags come from the props' JSDoc. A component counts when the story imports it directly or through re-exports, such as `import { Button } from '$lib/components'`. When a story renders a helper instead, name what it documents with [`component`](../../reference/svelte/story.md#component). A compound component's root comes first and open, and above three parts the rest start collapsed. In `poveste dev`, a story that imports components auto-docs can't trace to a file says so on its Docs tab.

- A default is the destructuring default (`size = 'md'`, through `$bindable(...)`), or an `export let` initialiser, then a `@default` or `@defaultValue` tag. Where both are written and disagree, the code's is shown, and dev marks the difference.
- A `Snippet` prop is a slot, and an `on…` function prop is an event. The `children` that `svelte/elements` declares counts as a slot only when the component's `$props()` takes it.
- HTML attributes from `svelte/elements` and other props declared in installed packages are left out, unless [`autoDocs.allow`](../../reference/config.md#autodocs) names the package.

If a story's markdown already has hand-written Props, Emits or Slots sections, delete them once auto-docs is on: the table shows beside them, and the two drift apart. Keep the prose a table can't carry, such as usage, accessibility notes and examples.

It reads the types with a TypeScript 6 and `svelte2tsx` that `@poveste/plugin-svelte` installs, so the book needs neither, and one on TypeScript 7 is read the same way. It reads the book's `tsconfig.app.json` or `tsconfig.json`. A book that installed `svelte2tsx` for an earlier release can remove it; on TypeScript 7 it has to, since `svelte2tsx` refuses TypeScript 7 as a peer and npm stops the install. A component without `lang="ts"` is read from what its destructuring implies.

## Source code

::: warning
Auto-CodeGen is not available for Svelte.
:::

To document a copyable source code manually you can use the `source` prop.

```svelte{6-11,17}
<script>
  const { Hst } = $props()

  const initState = () => ({ count: 0 })

  const source = `<h1>Toto</h1>

<input
  bind:value={state.count}
  type="number"
>`
</script>

<Hst.Story title="Hand-written source">
  <Hst.Variant
    title="Source prop"
    {initState}
    {source}
  >
    {#snippet children({ state })}
      <h1>Toto</h1>

      <input
        bind:value={state.count}
        type="number"
      >
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

### A `source` that follows the controls

A string literal is fixed, so it keeps showing the initial values however the reader moves the
controls — which is most of the point of the source panel. `source` also accepts a **function
of the state**, called with the current values:

```svelte{6-10,16}
<script>
  const { Hst } = $props()

  const initState = () => ({ count: 0 })

  const source = state => `<input
  bind:value={${state.count}}
  type="number"
>`
</script>

<Hst.Story title="Live source">
  <Hst.Variant
    title="Source function"
    {initState}
    {source}
  >
    {#snippet children({ state })}
      <input bind:value={state.count} type="number">
    {/snippet}
  </Hst.Variant>
</Hst.Story>
```

The function form exists because story props are evaluated in the component's script, where
the snippet's `state` is not in scope — so a literal cannot see what the controls are doing.

### No `source` slot

The Vue plugin also accepts a [`source` slot](../vue/docs.md#source-code), and notes that it
needs a `<textarea v-pre>` to stop Vue compiling the template. Svelte has no equivalent: pass
the prop, and use the function form when the source depends on state.

