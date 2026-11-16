<script lang="ts">
  import type { TypedBadgeProps } from './typed-badge'

  const { label, size, tone, level }: TypedBadgeProps = $props()
</script>

<span>{label} {size} {tone} {level}</span>
