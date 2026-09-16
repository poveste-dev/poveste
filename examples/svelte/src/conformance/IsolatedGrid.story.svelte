<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // `layout.isolate` opts a story out of sandbox reuse: every render gets a
  // fresh document (#240). Thirty variants — enough to scroll a window past.
  const count = 30
</script>

<Hst.Story
  id="conformance-isolated-grid"
  title="Conformance/Isolated grid"
  layout={{ type: 'grid', width: 200, isolate: true }}
>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant id={`v${n}`} title={`Variant ${n}`}>
      <button class="conformance-isolated-grid-button" style="height: 48px">Button {n}</button>
    </Hst.Variant>
  {/each}
</Hst.Story>
