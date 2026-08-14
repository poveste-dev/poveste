<script>
  import { getContext } from 'svelte'

  export let title = 'untitled'
  export let id = null
  export let icon = null
  export let iconColor = null
  // Absorbs the prop; collection never renders variant children. `export const`
  // (the compiler's suggestion) would make passing one an error.
  // svelte-ignore export_let_unused
  export let initState = null

  const story = getContext('__pvtStory')
  const addVariant = getContext('__pvtAddVariant')

  function generateId() {
    return `${story.id}-${story.variants.length}`
  }

  const variant = {
    id: id ?? generateId(),
    title,
    icon,
    iconColor,
  }

  addVariant(variant)
</script>
