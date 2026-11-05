---
title: 'Wrapper in Svelte — render markup around every story'
description: 'Use addWrapper to put a provider, a theme or a layout around every Svelte story in the book.'
---

# Wrapper

A wrapper renders around the displayed story or variant: a provider, a theme, a layout shell.

In your [setup file](./app-setup.md), add wrapper components with `addWrapper`:

```ts
import { defineSetupSvelte } from '@poveste/plugin-svelte'
import WrapperGlobal from './poveste/WrapperGlobal.svelte'

export const setupSvelte = defineSetupSvelte(({ addWrapper }) => {
  addWrapper(WrapperGlobal)
})
```

Add more than one and they nest, the first one added outermost. Each is rendered with the story's content as its `children`, and with `story` and `variant` as props:

```svelte
<script lang="ts">
  import type { Story, Variant } from 'poveste'
  import type { Snippet } from 'svelte'

  const { story, variant, children }: { story: Story, variant?: Variant, children?: Snippet } = $props()

  const hasWrapper = $derived(story.meta?.wrapper !== false && variant?.meta?.wrapper !== false)
</script>

<div class:padded={hasWrapper}>
  {@render children?.()}
</div>
```

A wrapper can call Svelte's `setContext`, and the story's components will read it with `getContext`.

## Turning it off for one story

Poveste doesn't have a switch for this, so the wrapper decides, as `hasWrapper` does above. Set a `meta` value of your own on a story or a variant:

```svelte
<Hst.Story meta={{ wrapper: false }}>
  <Hst.Variant title="No wrapper">
    <MyComponent />
  </Hst.Variant>
</Hst.Story>
```

## Around one story

For a wrapper around a single story, wrap the markup yourself:

```svelte
<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'
  import ThemeProvider from './ThemeProvider.svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story title="MyStory">
  <ThemeProvider>
    <MyComponent />
  </ThemeProvider>
</Hst.Story>
```
