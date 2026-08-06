<script>
import { getContext } from 'svelte'

const story = getContext('__pvtStory')
const currentVariant = getContext('__pvtVariant')
const slotName = getContext('__pvtSlot')
const index = getContext('__pvtIndex')

const variant = story.variants[index.value]
index.value++

$: shouldRender = currentVariant.id === variant.id

export let source = null

$: {
  if (source != null) {
    Object.assign(currentVariant, {
      source,
    })
  }
}
</script>

{#if shouldRender}
  {#if slotName === 'default'}
    <slot />
  {/if}
  {#if slotName === 'controls'}
    <slot name="controls" />
  {/if}
{/if}
