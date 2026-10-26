<script lang="ts">
  // SPIKE #348 — the entire Svelte-side bridge, if controls were custom elements.
  // No Vue application is booted here: the element owns its own rendering.
  let { value = $bindable(''), title = '' }: { value?: string, title?: string } = $props()

  let el: HTMLElement | undefined = $state()

  // Svelte writes a camelCase prop as a lowercased attribute, which a Vue custom
  // element does not read. The property is what lands.
  $effect(() => {
    if (el) (el as any).modelValue = value
  })

  // Attached imperatively: Svelte has no event-attribute syntax for a name
  // containing a colon, and `bind:value` is a compile error on a custom element.
  $effect(() => {
    if (!el) return
    const onUpdate = (event: Event) => {
      const next = (event as CustomEvent).detail?.[0]
      if (typeof next === 'string') value = next
    }
    el.addEventListener('update:modelValue', onUpdate)
    return () => el?.removeEventListener('update:modelValue', onUpdate)
  })
</script>

<pvt-text bind:this={el} {title}></pvt-text>
