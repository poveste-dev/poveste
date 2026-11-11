<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import TypedBadge from './TypedBadge.svelte'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-typed-controls" title="Controls from types">
  <Hst.Variant id="typed" title="Typed">
    <TypedBadge label="Typed" size="md" />
  </Hst.Variant>
  <Hst.Variant id="overridden" title="Overridden" autoProps={{ tone: 'text', level: { control: 'slider', min: 1, max: 6 }, secret: false }}>
    <TypedBadge label="Overridden" />
  </Hst.Variant>
</Hst.Story>
