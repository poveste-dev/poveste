<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Serialize">
  <Hst.Variant title="array">
    <div data-list={JSON.stringify(['a', 2, { foo: 'bar' }])}>Array</div>
  </Hst.Variant>
  <Hst.Variant title="object">
    <div data-obj={JSON.stringify({ a: 2, nested: { foo: 'bar' } })}>Object</div>
  </Hst.Variant>
</Hst.Story>
