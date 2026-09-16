<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // 1000 variants, because the windowing this exercises only fails at scale:
  // #103 was a grid that mounted every variant it scrolled past and never
  // unmounted, which is invisible at three.
  const count = 1000
</script>

<Hst.Story
  id="conformance-huge-grid"
  title="Conformance/Huge grid"
  layout={{ type: 'grid', width: 200 }}
>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant id={`v${n}`} title={`Variant ${n}`}>
      <!-- Sized past the grid's 40px cell floor on purpose. Below it the cell
      renders at the floor while the story renders smaller, so "the iframe took
      its content height" can never become true and the height assertions have
      nothing to measure. -->
      <button class="conformance-huge-grid-button" style="height: 48px">Button {n}</button>
    </Hst.Variant>
  {/each}
</Hst.Story>
