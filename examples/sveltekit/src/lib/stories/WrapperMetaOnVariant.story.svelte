<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story>
  <Hst.Variant title="With wrapper">🙀</Hst.Variant>
  <Hst.Variant title="No wrapper" meta={{ wrapper: false }}>😼</Hst.Variant>
</Hst.Story>
