<script>
  import { afterUpdate, getContext, onDestroy } from 'svelte'

  export let source = null
  // `null` rather than `false`/a handler: these two inherit from the story, and
  // a literal default is indistinguishable from a variant that set it — so a
  // variant could not opt out of what the story declared. `??` falls through on
  // null only, so an explicit `responsiveDisabled={false}` still wins (#466).
  export let responsiveDisabled = null
  export let autoPropsDisabled = false
  export let setupApp = null
  export let implicit = false

  const story = getContext('__pvtStory')
  const index = getContext('__pvtIndex')
  const storySlots = getContext('__pvtSlots')
  const storyProps = getContext('__pvtStoryProps') ?? {}
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
      responsiveDisabled: responsiveDisabled ?? storyProps.responsiveDisabled ?? false,
      autoPropsDisabled,
      setupApp: setupApp ?? storyProps.setupApp ?? null,
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
