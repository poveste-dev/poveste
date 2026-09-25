<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  // Probes rather than a stringify. `JSON.stringify` flattens a `Map` to `{}`
  // exactly as the broken walker did, so it agrees with the defect for the
  // wrong reason — each line below asks the value for something only the real
  // type has.
  class Point {
    x: number
    y: number
    constructor(x: number, y: number) {
      this.x = x
      this.y = y
    }
  }

  const initState = () => ({
    label: 'start',
    at: new Date(1790071200000),
    m: new Map([['a', 1]]),
    s: new Set([1, 2, 3]),
    re: /ab+c/gi,
    p: new Point(3, 4),
  })

  const probe = (value: any, read: (v: any) => unknown) => {
    try {
      const out = read(value)
      return out === undefined ? 'flattened' : String(out)
    }
    catch {
      return 'flattened'
    }
  }
</script>

<Hst.Story id="conformance-state-types" title="Conformance/State types" {initState}>
  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
  {/snippet}

  <Hst.Variant id="default" title="default">
    {#snippet children({ state })}
      <p class="conformance-types-date">{probe(state.at, v => v.getTime())}</p>
      <p class="conformance-types-map">{probe(state.m, v => v.get('a'))}</p>
      <p class="conformance-types-set">{probe(state.s, v => v.size)}</p>
      <p class="conformance-types-regexp">{probe(state.re, v => v.source)}</p>
      <p class="conformance-types-class">{probe(state.p, v => v.x)}</p>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
