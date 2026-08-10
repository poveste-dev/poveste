<script>
  import { getContext, setContext } from 'svelte'

  const story = getContext('__pvtStory')
  const currentVariant = getContext('__pvtVariant')
  const slotName = getContext('__pvtSlot')

  const index = { value: 0 }
  setContext('__pvtIndex', index)

  export let source = null

  $: {
    if (source != null) {
      Object.assign(currentVariant, {
        source,
      })
    }
  }
</script>

{#if slotName === 'controls'}
  <slot name="controls" />
{/if}
{#if slotName === 'default' || story.meta?.hasVariantChildComponents}
  <slot />
{/if}
