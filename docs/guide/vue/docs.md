---
title: 'Documentation in Vue — markdown and a props table beside a story'
description: 'Write markdown documentation alongside a Vue story, and get a props, slots and events table read from the component''s types, so the book explains the component as well as showing it.'
---

# Documentation

## Markdown

### Custom block

Poveste lets you write markdown documentation for your stories using Vue custom blocks. Add a `docs` tag in your story file:

```vue{5-9}
<template>
  <!-- Your story goes here -->
</template>

<docs lang="md">
# My documentation

Checkout this [cool video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)!
</docs>
```

### Sibling markdown

To add documentation to a story, you can also create a file with the same name next to it, with the `.md` extension.

For example, if your story is `BaseButton.story.vue`, create a `BaseButton.story.md` file.

Sibling markdown files are higher priority than custom blocks.

### Standalone page

If you create a markdown file ending with `.story.md` that isn't related to a sibling story file, it will automatically create a virtual story that renders the markdown as a page.

You can add a frontmatter to the markdown to customize the virtual story with the following properties:

- `id` ([reference](../../reference/vue/story.md#id))
- `title` ([reference](../../reference/vue/story.md#title))
- `icon` ([reference](../../reference/vue/story.md#icon))
- `iconColor` ([reference](../../reference/vue/story.md#iconcolor))
- `group` ([reference](../../reference/vue/story.md#group))

Example `Introduction.story.md` file:

```md
---
group: 'top'
icon: 'carbon:bookmark'
---

# Welcome

This is a demo book using Vue 3.

---

Learn more about Poveste [here](https://poveste.dev/).
```

### Links

You can link to other stories using a relative path to the story file:

```md
- [Go to Story](./BaseButton.story.vue)
- [Go to CodeGen > Slots](./CodeGen.story.vue?variantId=slots)
- [Go to Markdown file](./MarkdownFile.story.md)
```

## Props, slots and events

Each component a story imports gets a table on the story's **Docs** tab, whether it is a `.vue` file or one `defineComponent` makes in a `.ts` or `.tsx` file, below any markdown: its props with their types, descriptions and defaults, its slots, and its events. Poveste reads them from the component's types with `vue-component-meta`, so nothing is written for it. A component counts when the story imports it directly or through re-exports, such as `import { SelectRoot } from '..'` from a folder whose `index.ts` re-exports its `.vue` files. When a story renders a helper instead, name what it documents with [`component`](../../reference/vue/story.md#component). A compound component's root comes first and open, and above three parts the rest start collapsed. In `poveste dev`, a story that imports components auto-docs can't trace to a file says so on its Docs tab.

What each table reads:

- **Props** come from `defineProps`, including an interface that extends another from a separate file. Descriptions and tags come from each prop's JSDoc.
- **Defaults** come from `withDefaults` or the props object, then from a `@default` or `@defaultValue` tag. In `poveste dev`, a default whose tag says something else is marked; the built book shows the one the code applies.
- **`@deprecated`** is shown on its row; a prop tagged `@internal` or `@private` is left out.
- **Slots** come from `defineSlots`, and **events** from `defineEmits`.
- **Props a component inherits from installed packages**, such as the HTML attributes, are left out unless [`autoDocs.allow`](../../reference/config.md#autodocs) names the package.

A component written with the Options API gets its props from its `props` option, with the types and defaults that option declares. One that `defineComponent` makes in a `.ts` or `.tsx` file gets a table too, read from that file's default export; a plain object, a function or a type exported by default from a script file gets none.

In a Nuxt book, a component a story uses without importing it, because Nuxt registers it, counts as imported: Nuxt adds the import before auto-docs reads the story. Quasar's own components, such as `QBtn`, come from the `quasar` package's built JavaScript and get no table, as with any library; your own components in a Quasar book do.

If a story's markdown already has hand-written Props, Emits or Slots sections, delete them once auto-docs is on: the table shows beside them, and the two drift apart. Keep the prose a table can't carry, such as usage, accessibility notes and examples.

In `poveste dev`, nothing runs until a reader first opens a story's Docs tab. The first time can take many seconds while the types are read; after that the table is cached, and an edit to a component refreshes it. `poveste build` reads every story's components in one pass, so a build pays for the whole book at once: see [`autoDocs`](../../reference/config.md#autodocs) for the time and memory.

It needs TypeScript 6 or earlier installed in the book: `npm i -D typescript@6`. Without it, or with TypeScript 7, auto-docs turns itself off and says so once in the terminal. A built book carries the tables it read at build time, and leaves out a component whose types couldn't be read.

To turn it off, or narrow it, set [`autoDocs`](../../reference/config.md#autodocs) in the config:

```ts
export default defineConfig({
  autoDocs: false,
})
```

## Source code

By default, Poveste will attempt to generate a copyable source code from the story, dynamically from the current state.

Currently automatic source code generation is only supported for:

- Vue 3

To document a copyable source code manually you can use either the `source` prop or the `source` slot.

```vue{31,55-74}
<script lang="ts" setup>
function initState () {
  return {
    count: 0,
  }
}

const source = `<h1>Toto</h1>

<input
  v-model.number="count"
  type="number"
>

<p>{{ count }}</p>

<template #named="{ shown, hide }">
  <MyComponent
    v-if="shown"
    :item="{ foo: 'bar' }"
    @close="hide()"
  />
</template>`
</script>

<template>
  <Story title="Hand-written source">
    <Variant
      title="Source prop"
      :init-state="initState"
      :source="source"
    >
      <template #default="{ state }">
        <h1>Toto</h1>

        <input
          v-model.number="state.count"
          type="number"
        >
      </template>
    </Variant>
    <Variant
      title="Source template"
      :init-state="initState"
    >
      <template #default="{ state }">
        <h1>Toto</h1>

        <input
          v-model.number="state.count"
          type="number"
        >
      </template>

      <template #source>
        <textarea v-pre>
          <h1>Toto</h1>

          <input
            v-model.number="count"
            type="number"
          >

          <p>{{ count }}</p>

          <template #named="{ shown, hide }">
            <MyComponent
              v-if="shown"
              :item="{ foo: 'bar' }"
              @close="hide()"
            />
          </template>
        </textarea>
      </template>
    </Variant>
  </Story>
</template>
```

:::tip
You should use a `<textarea v-pre>` element in the `source` slot to prevent Vue from compiling the template.
:::
