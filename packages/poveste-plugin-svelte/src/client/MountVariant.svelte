<script>
  import { afterUpdate, onDestroy } from 'svelte'
  import { slotsContext, storyContext, storyPropsContext, targetVariantIdContext, variantIndexContext } from '../contexts.js'

  export let source = null
  // `null` rather than `false`/a handler: these two inherit from the story, and
  // a literal default is indistinguishable from a variant that set it — so a
  // variant could not opt out of what the story declared. `??` falls through on
  // null only, so an explicit `responsiveDisabled={false}` still wins (#466).
  export let responsiveDisabled = null
  export let autoPropsDisabled = false
  export let setupApp = null
  export let implicit = false
  export let initState = null

  const story = storyContext.get('<Variant>')
  const index = variantIndexContext.get('<Variant>')
  const storySlots = slotsContext.getOptional()
  const storyProps = storyPropsContext.getOptional() ?? {}
  // A store: a sandbox sets it to the one variant this realm serves and changes
  // it when the realm is retargeted (#240). Null in the app realm, which keeps
  // every variant's bookkeeping.
  const targetVariantId = targetVariantIdContext.getOptional()

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

  /**
   * Seeds `variant.state`, which is not only the render mounts' business.
   *
   * The app mounts the current story hidden and never renders a slot for it
   * unless the story has one — so a story with `initState` and no controls
   * snippet left the state empty, and the panel, which builds a control per key
   * out of it, said there were no controls at all. `plugin-vue` seeds from its
   * mount pass for exactly this reason.
   *
   * Guarded by the flag the render mounts already share, so whichever pass
   * arrives first wins and a reader's edit is never seeded over.
   *
   * Read off the story props as well as this variant's own, because a
   * story-level `initState` reaches an explicit variant only through the
   * context — the spread in `MountStory` covers the implicit one alone.
   */
  function seedState() {
    const seed = initState ?? storyProps.initState ?? null

    if (!seed || !variant || variant.__pvtStateSeeded) return

    variant.__pvtStateSeeded = true
    variant.state = { ...variant.state, ...seed() }
  }

  function becomeTarget() {
    if (isTarget) return
    isTarget = true
    seedState()
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
