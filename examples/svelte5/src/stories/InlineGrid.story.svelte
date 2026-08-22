<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import BaseButton from '../BaseButton.svelte'

  export let Hst: Hst
</script>

<!-- `iframeGrid: false` renders cells inline; nothing else covers that path. -->
<Hst.Story title="InlineGrid" layout={{ type: 'grid', width: 200, iframeGrid: false }}>
  {#each [1, 2] as n (n)}
    <Hst.Variant title={`Variant ${n}`}>
      <BaseButton>Click me {n}</BaseButton>
    </Hst.Variant>
  {/each}
</Hst.Story>
