<script>
  import { addVariantContext, collectStoryContext } from '../contexts.js'

  export let title = 'untitled'
  export let id = null
  export let icon = null
  export let iconColor = null
  // Collected rather than left to `MountVariant`, which sets it when the mount
  // realm runs — and the realm that reads it renders in parallel, so whether a
  // variant's auto-props were off came down to which mount finished first (#890).
  export let autoPropsDisabled = false
  // Absorbs the prop; collection never renders variant children. `export const`
  // (the compiler's suggestion) would make passing one an error.
  // svelte-ignore export_let_unused
  export let initState = null

  // Asked for before anything reads them, so a missing `<Story>` is reported
  // once and the same way whether or not the variant carries an `id`. Reading
  // `story.id` inside `generateId` meant the no-id path died on `undefined`
  // and the id path died on `addVariant` not being a function (#981).
  const story = collectStoryContext.get('<Variant>')
  const addVariant = addVariantContext.get('<Variant>')

  const variant = {
    id: id ?? `${story.id}-${story.variants.length}`,
    title,
    icon,
    iconColor,
    autoPropsDisabled,
  }

  addVariant(variant)
</script>
