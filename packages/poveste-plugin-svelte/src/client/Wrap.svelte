<script>
  // MEASUREMENT ONLY (#1114) — the bridge replaced by a generic custom-element wrapper.
  import { createEventDispatcher, onMount } from 'svelte'
  import { controlTag } from './elements.js'

  export let controlComponent
  export let value

  const dispatch = createEventDispatcher()
  const tag = controlTag(controlComponent)

  let el

  $: if (el) {
    el.modelValue = value
    for (const key in $$restProps) {
      el[key] = $$restProps[key]
    }
  }

  onMount(() => {
    const emits = controlComponent.emits
      ? (Array.isArray(controlComponent.emits) ? controlComponent.emits : Object.keys(controlComponent.emits))
      : []
    for (const key of emits) {
      const eventName = key === 'input' ? 'update:modelValue' : key
      el.addEventListener(eventName, (event) => {
        if (eventName === 'update:modelValue') {
          value = event.detail[0]
        }
        else {
          dispatch(key, ...event.detail)
        }
      })
    }
  })
</script>

<svelte:element this={tag} bind:this={el} />
