<script>
import { omitInheritStoryProps } from '@poveste/shared'
import { getContext, setContext } from 'svelte'
import MountVariant from './MountVariant.svelte'

const story = getContext('__pvtStory')
let index = { value: 0 }
setContext('__pvtIndex', index)
setContext('__pvtSlots', $$slots)

$: inheritedFromStory = Object.keys(story).filter(key => !omitInheritStoryProps.includes(key)).reduce((acc, key) => {
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
