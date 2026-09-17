<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import DeclaredProps from './DeclaredProps.svelte'

  export let Hst: Hst
</script>

<!-- Set on the story over explicit variants, which story props do not reach (#466). -->
<Hst.Story id="conformance-auto-props-disabled" title="Auto props disabled" autoPropsDisabled layout={{ type: 'grid', width: 200 }}>
  <Hst.Variant id="first" title="First">
    <DeclaredProps label="first" />
  </Hst.Variant>
  <Hst.Variant id="second" title="Second">
    <DeclaredProps label="second" />
  </Hst.Variant>
</Hst.Story>
