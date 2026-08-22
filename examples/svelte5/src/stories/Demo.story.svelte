<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import Demo from './Demo.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Demo">
  <Hst.Variant>
    <Demo message="Hello world!" />
  </Hst.Variant>

  <Hst.Variant title="Variant 2" icon="carbon:accessibility-alt" iconColor="#00bebe">
    <Demo message="Meow!" />
  </Hst.Variant>
</Hst.Story>
