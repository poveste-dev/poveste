<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import type { Icon } from './index'

  interface Props {
    /** Passed to the icon, a component the book's `paths` map and an index re-exports. */
    icon?: ComponentProps<typeof Icon>
  }
  const { icon }: Props = $props()
</script>

<div>{icon?.name}</div>
