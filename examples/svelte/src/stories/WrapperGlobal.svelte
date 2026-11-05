<script lang="ts">
  import type { Story, Variant } from 'poveste'
  import type { Snippet } from 'svelte'

  const { story, variant, children }: { story: Story, variant?: Variant, children?: Snippet } = $props()

  const hasWrapper = $derived(story.meta?.wrapper !== false && variant?.meta?.wrapper !== false)
</script>

<div class="global-wrapper" style={hasWrapper ? 'padding: 0.25rem; border: solid 1px rgba(0, 0, 0, 0.05);' : ''}>
  {@render children?.()}
</div>
