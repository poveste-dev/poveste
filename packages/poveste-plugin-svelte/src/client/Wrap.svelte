<script>
  import { CONTROL_SLOTS_EVENT, controlElementTag, SLOT_CONTENT_ATTR } from '@poveste/controls'
  import { createEventDispatcher, onMount } from 'svelte'

  export let controlComponent
  export let value

  const dispatch = createEventDispatcher()
  const tag = controlElementTag(controlComponent.name)

  // `update:modelValue` is what `bind:value` reads; anything else the control emits
  // becomes a Svelte event of the same name.
  const emits = controlComponent.emits ?? []
  const listeners = {}
  for (const event of Array.isArray(emits) ? emits : Object.keys(emits)) {
    listeners[`on${event.charAt(0).toUpperCase()}${event.substring(1)}`] = event === 'update:modelValue'
      ? (next) => {
        value = next
      }
      : (...args) => dispatch(event, ...args)
  }

  let el
  let source
  let calls = []

  $: props = { ...$$restProps, modelValue: value, ...listeners }
  $: if (el) el.slotSource = source ?? null

  onMount(() => {
    const read = () => {
      calls = el.slotCalls
    }
    read()
    el.addEventListener(CONTROL_SLOTS_EVENT, read)
    return () => el.removeEventListener(CONTROL_SLOTS_EVENT, read)
  })
</script>

<!-- `props` is a property on the element, which Svelte sets before inserting it. -->
<svelte:element this={tag} bind:this={el} {props} slots={$$slots.default ? ['default'] : []} />
{#if $$slots.default}
  <span hidden bind:this={source}>
    {#each calls as call, index (index)}
      <span {...{ [SLOT_CONTENT_ATTR]: index }} style="display: contents"><slot {...call.props} /></span>
    {/each}
  </span>
{/if}
