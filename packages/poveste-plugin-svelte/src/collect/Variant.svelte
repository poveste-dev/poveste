<script>
  import { getContext } from 'svelte'

  export let title = 'untitled'
  export let id = null
  export let icon = null
  export let iconColor = null
  // Declared but unused: collection does not render variant children, and an
  // undeclared prop would warn on every story that passes one. The compiler
  // then warns that *this* is unused, naming a path inside our dist with no
  // story attached to it — noise on every consumer's dev server, about a file
  // they cannot act on. `export const` is the compiler's suggestion and is
  // wrong here: it makes the prop read-only, so passing one becomes an error.
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
