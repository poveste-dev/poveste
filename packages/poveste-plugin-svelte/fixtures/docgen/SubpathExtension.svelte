<script lang="ts">
  import type { KindProps } from '#lib/kinds.ts'

  const { kind }: KindProps = $props()
</script>

<span>{kind}</span>
