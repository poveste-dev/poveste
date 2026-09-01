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

## Source code

::: warning
Auto-CodeGen is not available for Svelte.
:::

To document a copyable source code manually you can use the `source` prop.

```svelte{6-11,17}
<script>
  export let Hst

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
  export let Hst

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

