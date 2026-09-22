<script>
  import { addStoryContext, addVariantContext, collectStoryContext, storyFileContext } from '../contexts.js'

  export let title = null
  export let id = null
  export let group = null
  export let layout = null
  export let icon = null
  export let iconColor = null
  export let docsOnly = false
  export let autoPropsDisabled = null
  export let initState = null

  const addStory = addStoryContext.getOptional()
  const file = storyFileContext.getOptional()

  // Guarded the way `plugin-vue` guards it: collected outside a run there is no
  // file to fall back on, and reading `file.id` off `undefined` said nothing
  // about stories (#981).
  const storyId = id ?? file?.id
  const storyTitle = title ?? file?.fileName

  if (!storyId || storyTitle === undefined) {
    throw new Error('[poveste] a <Story> collected outside a story file needs an `id` and a `title`')
  }

  const story = {
    id: storyId,
    title: storyTitle,
    group,
    layout,
    icon,
    iconColor,
    docsOnly,
    // Collected rather than inherited down: `MountStory` forwards story props
    // only to an implicit variant (#466). Left undefined when unset, or the
    // collector's `??=` merge could never apply `defaultStoryProps`.
    autoPropsDisabled,
    variants: [],
  }

  addStory?.(story)

  // Collection renders the story's markup purely to discover its variants, but
  // that markup now reads `state`. Without a value here every expression
  // referencing it throws and collection fails with a bare
  // `Cannot read properties of undefined` (#81).
  const state = initState ? initState() : {}

  collectStoryContext.set(story)
  addVariantContext.set((variant) => {
    story.variants.push(variant)
  })
</script>

<slot {state} />
