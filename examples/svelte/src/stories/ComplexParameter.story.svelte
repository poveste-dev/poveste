<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import ComplexParameter from './ComplexParameter.svelte'

  export let Hst: Hst

  // A cycle and a function in one story's props, on purpose: both are things
  // JSON cannot carry, and the panel has to survive them.
  const parent = { name: 'hello' } as { name: string } & Record<string, unknown>
  const child = {} as Record<string, unknown>

  parent.child = child
  child.parent = parent

  const myParameter = [
    { action: () => { console.log('Hello world!') } },
  ]
</script>

<Hst.Story title="ComplexParameter" layout={{ type: 'single', iframe: false }}>
  <ComplexParameter complexParameter={myParameter} recursiveParameter={parent} />
</Hst.Story>
