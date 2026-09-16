<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Every variant carries its own `initState` and renders from it. A cell
  // handed this variant by a retarget (#240) has to run that setup — the realm
  // only ever mounted the variant it booted for — or the label is empty.
  //
  // Keys are per variant: a key shared across variants is shared state, by way
  // of the story's implicit state, so a common `label` would read the same in
  // every cell. A hundred, so the window scrolls past its first fill.
  const count = 100
</script>

<Hst.Story
  id="conformance-grid-state"
  title="Conformance/Grid state"
  layout={{ type: 'grid', width: 200 }}
>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant id={`v${n}`} title={`Variant ${n}`} initState={() => ({ [`label${n}`]: `Variant ${n}` })}>
      {#snippet children({ state })}
        <span class="conformance-grid-state-label" style="display: block; height: 48px">{state[`label${n}`]}</span>
      {/snippet}
    </Hst.Variant>
  {/each}
</Hst.Story>
