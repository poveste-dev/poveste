<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-wrapper" title="Conformance/Wrapper" meta={{ wrapper: false }}>
  <Hst.Variant id="story-meta" title="story meta">
    <p class="conformance-wrapper-text">Story-level wrapper meta</p>
  </Hst.Variant>
  <Hst.Variant id="variant-meta" title="variant meta" meta={{ wrapper: true }}>
    <p class="conformance-wrapper-text">Variant-level wrapper meta</p>
  </Hst.Variant>
</Hst.Story>
