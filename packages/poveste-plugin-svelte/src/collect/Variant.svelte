<script>
  import { getContext } from 'svelte'

  export let title = 'untitled'
  export let id = null
  export let icon = null
  export let iconColor = null
  // Declared but unused: collection does not render variant children, and an
  // undeclared prop would warn on every story that passes one.
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
