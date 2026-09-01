# Story with variants

These patterns let you create several variants of your component to visualize several states of your component.

## Isolated

This will display variants as separate pages that you can navigate into. This view will be the same as single stories, and you will be able to resize your components.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="MyStory">
  <Hst.Variant title="MyVariant 1">
    <MyComponent argument="hello" />
  </Hst.Variant>
  <Hst.Variant title="MyVariant 2">
    <MyComponent argument="world" />
  </Hst.Variant>
</Hst.Story>
```

## Grid

This will display variants in a grid for you to visualize all the variants on the same page. You must fix the width (it can be a percentage).

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst
</script>

<Hst.Story
  title="MyStory"
  layout={{ type: 'grid', width: 200 }}
>
  <Hst.Variant title="MyVariant 1">
    <MyComponent argument="hello" />
  </Hst.Variant>
  <Hst.Variant title="MyVariant 2">
    <MyComponent argument="world" />
  </Hst.Variant>
</Hst.Story>
```

## Auto generated grid

When you have a lot of variants to test, it can be easier to generate them with this pattern.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const args = ['hello', 'world', 'etc', '...']
</script>

<Hst.Story
  title="MyStory"
  layout={{ type: 'grid', width: 200 }}
>
  {#each args as argument, key (argument)}
    <Hst.Variant title={`MyVariant ${key}`}>
      <MyComponent {argument} />
    </Hst.Variant>
  {/each}
</Hst.Story>
```

## Auto generated grid with props binding

When your variants have a lot of arguments, you can spread them.

```svelte
<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'

  export let Hst: Hst

  const propsVariants = [
    { argument: 'hello', color: 'red', count: 4 },
    { argument: 'world', color: 'blue', count: 5 },
    { argument: 'etc', color: 'violet', count: 6 },
  ]
</script>

<Hst.Story
  title="MyStory"
  layout={{ type: 'grid', width: 200 }}
>
  {#each propsVariants as props, key (props.argument)}
    <Hst.Variant title={`MyVariant ${key}`}>
      <MyComponent {...props} />
    </Hst.Variant>
  {/each}
</Hst.Story>
```

Svelte's `{#each}` replaces Vue's `v-for`, and `{...props}` replaces `v-bind="props"`. The third `{#each}` argument is the key, which Svelte wants to be the stable identity rather than the index.
