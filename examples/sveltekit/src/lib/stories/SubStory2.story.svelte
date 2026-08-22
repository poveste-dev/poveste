<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Sub Folder/Sub Story 2" layout={{ type: 'grid', width: 200 }}>
  <Hst.Variant title="default">
    <p>This is a sub story</p>
  </Hst.Variant>
</Hst.Story>
