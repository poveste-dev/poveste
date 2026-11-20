<script lang="ts">
  import type { TypedBadgeProps } from './typed-badge'

  const { label, size, tone, level, outlined = true, shape = 'round' }: TypedBadgeProps = $props()
</script>

<span>{label} {size} {tone} {level} {outlined ? 'outlined' : 'filled'} {shape}</span>
