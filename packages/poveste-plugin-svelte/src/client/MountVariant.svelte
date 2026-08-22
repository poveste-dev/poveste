<script>
  import { afterUpdate, getContext } from 'svelte'

  export let source = null
  export let responsiveDisabled = false
  export let autoPropsDisabled = false
  export let setupApp = null
  export let implicit = false

  const story = getContext('__pvtStory')
  const index = getContext('__pvtIndex')
  const storySlots = getContext('__pvtSlots')
  // Null outside a sandbox; the app realm keeps every variant's bookkeeping.
  const targetVariantId = getContext('__pvtTargetVariantId') ?? null

  const variant = story.variants[index.value]
  index.value++

  // A sandbox mounts the story to serve one variant. The others still get an
  // instance — that is the story's `{#each}` — but their slot/config sync and
  // the afterUpdate re-run are work for a variant this realm never renders (#197).
  const isTarget = targetVariantId === null || variant?.id === targetVariantId

  function updateVariant() {
    Object.assign(variant, {
      slots: () => ({
        default: true,
        controls: $$slots.controls ?? storySlots.controls,
      }),
      source,
      responsiveDisabled,
      autoPropsDisabled,
      setupApp,
      configReady: true,
    })

    if (!implicit && !story.meta?.hasVariantChildComponents) {
      story.meta = story.meta || {}
      Object.assign(story.meta, {
        hasVariantChildComponents: true,
      })
    }
  }
  if (isTarget) {
    updateVariant()

    afterUpdate(() => {
      updateVariant()
    })
  }
</script>

{#if false}
  <slot />
  <slot name="controls" />
{/if}
