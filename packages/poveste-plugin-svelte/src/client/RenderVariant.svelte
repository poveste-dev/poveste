<script>
  import { watch as _watch } from '@poveste/vendors/vue'
  import { getContext, onDestroy } from 'svelte'

  const story = getContext('__pvtStory')
  const currentVariant = getContext('__pvtVariant')
  const slotName = getContext('__pvtSlot')
  const index = getContext('__pvtIndex')

  const variant = story.variants[index.value]
  index.value++

  // Not `$:`: Svelte invalidates a reactive statement when a variable it
  // references is reassigned, and both of these are consts that never are —
  // so the statement ran exactly once whichever way it is written.
  const shouldRender = currentVariant.id === variant.id

  export let source = null
  export let initState = null

  // Same contract as `RenderStory`: poveste owns the state because the story is
  // mounted once per slot, so a component-local variable cannot be shared (#81).
  // `variant.state` is also the only bucket the sandbox bridge carries across the
  // iframe boundary, which is why state is per variant rather than per story.
  if (initState && shouldRender && !currentVariant.__pvtStateSeeded) {
    currentVariant.__pvtStateSeeded = true
    currentVariant.state = { ...currentVariant.state, ...initState() }
  }

  // Controls mount only — see the note in RenderStory: the two mounts do not share
  // a realm for iframe layouts, so this is what keeps it to one warning.
  if (!initState && shouldRender && slotName === 'controls' && $$slots.controls && !currentVariant.__pvtStateWarned) {
    currentVariant.__pvtStateWarned = true
    console.error([
      `[poveste] Variant "${variant?.title ?? variant?.id}" has a controls slot but no \`initState\`.`,
      'Controls will render and appear to work, but their edits cannot reach the story:',
      'the story is mounted separately for each slot, so a component-local variable is not shared.',
      'Pass `initState` and read state from the snippet —',
      'https://poveste.dev/guide/svelte/controls.html',
    ].join(' '))
  }

  let state = currentVariant?.state

  const stopWatchingState = _watch(() => currentVariant?.state, () => {
    state = currentVariant?.state
  }, { deep: true })

  onDestroy(stopWatchingState)

  // `source` may be a function of the state. Story props are evaluated in the
  // component's script, where the slot's `state` is not in scope, so a string
  // literal cannot reflect what the controls are doing — which is most of the
  // point of the source panel (#81).
  $: {
    const resolvedSource = typeof source === 'function' ? source(state) : source
    if (resolvedSource != null) {
      Object.assign(currentVariant, {
        source: resolvedSource,
      })
    }
  }
</script>

{#if shouldRender}
  {#if slotName === 'default'}
    <slot {state} />
  {/if}
  {#if slotName === 'controls'}
    <slot name="controls" {state} />
  {/if}
{/if}
