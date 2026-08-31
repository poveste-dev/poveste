# Wrapper

**Not supported yet.**

The Vue plugin lets a [setup file](./app-setup.md) add components that render around every story with `addWrapper`. The Svelte plugin has no equivalent: there is no `addWrapper`, and `Hst.Story` and `Hst.Variant` have no `meta` prop for a story to opt out with.

This is tracked in [#232](https://github.com/poveste-dev/poveste/issues/232).

## What to do instead

For a wrapper you want around one story, wrap the markup yourself:

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'
  import ThemeProvider from './ThemeProvider.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="MyStory">
  <ThemeProvider>
    <MyComponent />
  </ThemeProvider>
</Hst.Story>
```

For something every story needs — a CSS import, a global store, a locale — the [setup file](./app-setup.md) still runs, so anything that does not need to render *around* the component belongs there.

What the setup file cannot do is put an element in the tree above each story. That is the gap.
