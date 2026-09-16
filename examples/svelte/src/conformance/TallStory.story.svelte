<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Far taller than any preview area, so the story overflows it whatever the
  // window size. The preview must scroll rather than clip (#258).
  //
  // `iframe: false` on purpose: with one, the story scrolls inside the sandbox
  // document and never overflows the host, which is where the clipping was.
  const rows = 120
</script>

<Hst.Story id="conformance-tall-story" title="Conformance/Tall story" layout={{ type: 'single', iframe: false }}>
  <Hst.Variant id="tall" title="Tall">
    <div class="conformance-tall-story">
      {#each Array.from({ length: rows }, (_, i) => i + 1) as n (n)}
        <p style="height: 40px; margin: 0">Row {n}</p>
      {/each}
      <p class="conformance-tall-story-end" style="height: 40px; margin: 0">End</p>
    </div>
  </Hst.Variant>
</Hst.Story>
