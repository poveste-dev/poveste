<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import Throws from './Throws.svelte'

  export let Hst: HstType
</script>

<Hst.Story id="conformance-throws" title="Conformance/Throws">
  <Hst.Variant id="throwing" title="throwing">
    <Throws />
  </Hst.Variant>
  <Hst.Variant id="healthy" title="healthy">
    <div class="conformance-throws-healthy">renders</div>
  </Hst.Variant>
</Hst.Story>
