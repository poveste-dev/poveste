<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import HelloWorld from './WithSass.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="With sass">
  <Hst.Variant title="playground">
    <HelloWorld />
  </Hst.Variant>
</Hst.Story>
