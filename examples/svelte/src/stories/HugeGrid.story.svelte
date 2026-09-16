<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import BaseButton from '../BaseButton.svelte'

  export let Hst: Hst

  const count = 1000
</script>

<Hst.Story title="HugeGrid" layout={{ type: 'grid', width: 200 }}>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant title={`Variant ${n}`}>
      <BaseButton>Button {n}</BaseButton>
    </Hst.Variant>
  {/each}
</Hst.Story>
