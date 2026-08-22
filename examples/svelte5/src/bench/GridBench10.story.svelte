<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Bench fixture (#197): same cell as its siblings, only the variant count
  // differs. Ignored by the example config unless POVESTE_BENCH=1.
  const count = 10
</script>

<Hst.Story
  id="bench-grid-10"
  title="Bench/Grid 10"
  layout={{ type: 'grid', width: 200 }}
>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant id={`v${n}`} title={`Variant ${n}`}>
      <button style="height: 48px">Button {n}</button>
    </Hst.Variant>
  {/each}
</Hst.Story>
