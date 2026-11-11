<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import OtherBadge from './typed/TypedBadge.svelte'
  import TypedBadge from './TypedBadge.svelte'

  export let Hst: HstType
</script>

<!-- Two components of one name: neither may be given the other's types (#160). -->
<Hst.Story id="conformance-typed-controls-same-name" title="Controls from types, same name">
  <Hst.Variant id="same-name" title="Same name">
    <TypedBadge label="First" size="md" />
    <OtherBadge size={2} />
  </Hst.Variant>
</Hst.Story>
