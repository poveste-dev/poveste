<script lang="ts">
  import type { AutoDocsButtonProps } from './types'

  const { label, size = 'md', level = 2, icon, onpress, ...rest }: AutoDocsButtonProps = $props()
</script>

<button {...rest} data-size={size} data-level={level} onclick={event => onpress?.(event)}>
  {@render icon?.()}
  {label}
</button>
