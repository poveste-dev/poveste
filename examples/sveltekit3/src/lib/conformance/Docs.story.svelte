<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType
</script>

<Hst.Story id="conformance-docs" title="Conformance/Documentation">
  <Hst.Variant id="default" title="default">
    <p class="conformance-docs-text">A story with a docs block</p>
  </Hst.Variant>
</Hst.Story>
