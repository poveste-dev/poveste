<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import AutoDocsButton from './AutoDocsButton.svelte'

  // Auto-docs (#501): the docs tab reads AutoDocsButton's props from the type on
  // its `$props()`, an interface imported from another file that extends a third.
  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story id="auto-docs-button" title="Auto-docs button">
  <AutoDocsButton label="Press me" />
</Hst.Story>
