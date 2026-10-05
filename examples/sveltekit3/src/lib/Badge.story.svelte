<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import Badge from './Badge.svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story id="badge" title="Badge">
  <Hst.Variant id="info" title="Info"><Badge label="Information" /></Hst.Variant>
  <Hst.Variant id="warn" title="Warn"><Badge label="Careful" tone="warn" /></Hst.Variant>
</Hst.Story>
