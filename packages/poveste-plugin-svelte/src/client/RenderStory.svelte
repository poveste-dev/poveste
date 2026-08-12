<script>
  import { watch as _watch } from '@poveste/vendors/vue'
  import { getContext, onDestroy, setContext } from 'svelte'

  const story = getContext('__pvtStory')
  const currentVariant = getContext('__pvtVariant')
  const slotName = getContext('__pvtSlot')

  const index = { value: 0 }
  setContext('__pvtIndex', index)

  export let source = null
  export let initState = null

  // Poveste owns the state, not the story component.
  //
  // The story is mounted once per slot — the app renders it with
  // `slot-name="controls"`, the preview with the default — so a `let count` in
  // the story exists twice and cannot be shared. Svelte 4 bridged the two
  // instances with `$capture_state` / `$inject_state`; Svelte 5 provides neither,
  // and no shim does either. So state lives on the variant, which both mounts
  // read from the same context object and which the sandbox bridge already
  // serialises across the iframe boundary (#81).
  //
  // Whichever mount arrives first seeds it; the second must not, or it would
  // clobber whatever the user has already changed.
  if (initState && currentVariant && !currentVariant.__pvtStateSeeded) {
    currentVariant.__pvtStateSeeded = true
    currentVariant.state = { ...currentVariant.state, ...initState() }
  }

  if (!initState && $$slots.controls && currentVariant && !currentVariant.__pvtStateWarned) {
    currentVariant.__pvtStateWarned = true
    console.error(
      `[poveste] Story "${story?.title ?? story?.id}" has a controls slot but no \`initState\`. `
        + `Controls will render and appear to work, but their edits cannot reach the story: `
      + `the story is mounted separately for each slot, so a component-local variable is not shared. `
        + `Pass \`initState\` and read state from the slot — https://poveste.dev/guide/svelte/app-setup.html`,
    )
  }

  // `variant.state` is a Vue-reactive object, so Svelte has no way to know when a
  // control writes into it. Mirroring the reference back into a local on every
  // Vue tick is what makes the template re-render: Svelte's invalidation treats
  // any object assignment as a change, so reassigning the same proxy is enough.
  let state = currentVariant?.state

  const stopWatchingState = _watch(() => currentVariant?.state, () => {
    state = currentVariant?.state
  }, { deep: true })

  onDestroy(stopWatchingState)

  $: {
    if (source != null) {
      Object.assign(currentVariant, {
        source,
      })
    }
  }
</script>

{#if slotName === 'controls'}
  <slot name="controls" {state} />
{/if}
{#if slotName === 'default' || story.meta?.hasVariantChildComponents}
  <slot {state} />
{/if}
