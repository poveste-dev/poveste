<script>
  import { setContext } from 'svelte'

  const { story, children } = $props()

  setContext('from-wrapper', `wrapped ${story.id}`)
</script>

<div data-wrapper="outer">{@render children?.()}</div>
