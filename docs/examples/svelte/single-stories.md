# Single stories

Here are some pattern examples to test your component without any variant. This is the simplest way to get you started.

## Within an iframe

This will display your component inside an iframe to be able to test the responsiveness correctly. The iframe is needed for CSS media queries to work properly.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="MyStory">
  <MyComponent />
</Hst.Story>
```

`Hst` is a prop the plugin passes to every `.story.svelte` file — you do not import the components, you receive them. That is the main shape difference from Vue, where `Story` and `Variant` are globals.

## Integrated

This will integrate your component directly in the app. The advantage being that you can pass complex arguments (such as functions or recursive objects), but responsiveness won't work for CSS media queries.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst
</script>

<Hst.Story
  title="MyStory"
  layout={{ type: 'single', iframe: false }}
>
  <MyComponent />
</Hst.Story>
```

Note that `layout` takes a plain object here. Svelte has no `:prop` binding syntax, so where the Vue examples bind an object with `:layout`, Svelte nests one set of braces inside another — the outer pair is Svelte's expression delimiter and the inner pair is the object literal, as in the fence above.
