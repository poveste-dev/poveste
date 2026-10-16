<script lang="ts">
  import type { ButtonProps } from './types'

  let { label, size = 'md', level = 2, pressed = $bindable(false), icon, children, onpress, ...rest }: ButtonProps = $props()
</script>

<button {...rest} data-size={size} data-level={level} aria-pressed={pressed} onclick={event => onpress?.(event)}>
  {@render icon?.(size)}
  {label}
  {@render children?.()}
</button>
