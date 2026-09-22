<script>
  import { omitInheritStoryProps } from '@poveste/shared'
  import { slotsContext, storyContext, storyPropsContext, variantIndexContext } from '../contexts.js'
  import MountVariant from './MountVariant.svelte'

  const story = storyContext.get('<Story>')
  const index = { value: 0 }
  variantIndexContext.set(index)
  slotsContext.set($$slots)
  // Slots were given this treatment and props never were, so a story-level prop
  // reached an implicit variant and was dropped the moment a story declared
  // explicit ones — `$$restProps` is only spread in the branch below (#466).
  storyPropsContext.set($$restProps)

  // Not `$:`: Svelte invalidates a reactive statement when a variable it
  // references is reassigned, and `story` is a const read from context that
  // never is — so the statement ran exactly once whichever way it is written.
  const inheritedFromStory = Object.keys(story).filter(key => !omitInheritStoryProps.includes(key)).reduce((acc, key) => {
    acc[key] = story[key]
    return acc
  }, {})
</script>

{#if story.variants.length === 1 && story.variants[0].id === '_default'}
  <MountVariant {...inheritedFromStory} {...$$restProps} implicit>
    <slot />
    <slot name="controls" slot="controls" />
  </MountVariant>
{:else}
  <slot />
{/if}
