<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story meta={{ wrapper: false }}>
  <Hst.Variant title="No wrapper">🙀</Hst.Variant>
  <Hst.Variant title="Still no wrapper">😼</Hst.Variant>
</Hst.Story>
