<script>
  import { afterUpdate, getContext, onDestroy } from 'svelte'

  export let source = null
  export let responsiveDisabled = false
  export let autoPropsDisabled = false
  export let setupApp = null
  export let implicit = false

  const story = getContext('__pvtStory')
  const index = getContext('__pvtIndex')
  const storySlots = getContext('__pvtSlots')
  // A store: a sandbox sets it to the one variant this realm serves and changes
  // it when the realm is retargeted (#240). Null in the app realm, which keeps
  // every variant's bookkeeping.
  const targetVariantId = getContext('__pvtTargetVariantId') ?? null

  const variant = story.variants[index.value]
  index.value++

  // A sandbox mounts the story to serve one variant. The others still get an
  // instance — that is the story's `{#each}` — but their slot/config sync and
  // the afterUpdate re-run are work for a variant this realm never renders (#197).
  let isTarget = false

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

  function becomeTarget() {
    if (isTarget) return
    isTarget = true
    updateVariant()
  }

  if (targetVariantId === null) {
    becomeTarget()
  }
  else {
    // Subscribed rather than `$`-read: the subscriber runs as the store is
    // set, so the variant has registered before the render pass that follows
    // the retarget mounts it.
    const unsubscribe = targetVariantId.subscribe((id) => {
      if (id === null || variant?.id === id) becomeTarget()
    })
    onDestroy(unsubscribe)
  }

  afterUpdate(() => {
    if (isTarget) updateVariant()
  })
</script>

{#if false}
  <slot />
  <slot name="controls" />
{/if}
