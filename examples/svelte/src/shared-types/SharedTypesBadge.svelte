<script lang="ts">
  import type { SharedTypesBadgeProps } from './types'

  const { text, count, active }: SharedTypesBadgeProps = $props()
</script>

<span class="shared-types-badge">{text} · {count} · {active ? 'on' : 'off'}</span>
