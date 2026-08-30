<script>
  import { getContext, setContext } from 'svelte'

  export let title = null
  export let id = null
  export let group = null
  export let layout = null
  export let icon = null
  export let iconColor = null
  export let docsOnly = false
  export let autoPropsDisabled = false
  export let initState = null

  const addStory = getContext('__pvtAddStory')
  const file = getContext('__pvtStoryFile')

  const story = {
    id: id ?? file.id,
    title: title ?? file.fileName,
    group,
    layout,
    icon,
    iconColor,
    docsOnly,
    // Collected rather than inherited down: `MountStory` forwards story props
    // only to an implicit variant (#466), and turning auto-props off has to work
    // on a story that lists its variants.
    autoPropsDisabled,
    variants: [],
  }

  addStory(story)

  // Collection renders the story's markup purely to discover its variants, but
  // that markup now reads `state`. Without a value here every expression
  // referencing it throws and collection fails with a bare
  // `Cannot read properties of undefined` (#81).
  const state = initState ? initState() : {}

  setContext('__pvtStory', story)
  setContext('__pvtAddVariant', (variant) => {
    story.variants.push(variant)
  })
</script>

<slot {state} />
