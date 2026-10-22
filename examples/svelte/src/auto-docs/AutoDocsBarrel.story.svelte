<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import { AutoDocsButton } from './parts'

  // Imported through a barrel and named in `component` (#1432): the docs tab
  // documents AutoDocsButton, which a story importing `./parts` used not to reach.
  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story id="auto-docs-barrel" title="Auto-docs barrel" component={AutoDocsButton}>
  <AutoDocsButton label="Through a barrel" />
</Hst.Story>
