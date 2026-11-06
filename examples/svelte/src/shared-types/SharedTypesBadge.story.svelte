<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import SharedTypesBadge from './SharedTypesBadge.svelte'

  // Controls for a component whose props type is imported from a shared file, with
  // no default and nothing passed, so the type is all there is to read (#501).
  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story id="shared-types-controls" title="Shared props type">
  <SharedTypesBadge />
</Hst.Story>
