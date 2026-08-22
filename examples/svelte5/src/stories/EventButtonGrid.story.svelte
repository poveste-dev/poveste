<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import { logEvent } from 'poveste/client'
  import EventButton from './EventButton.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="events/EventButtonGrid" layout={{ type: 'grid', width: 500 }}>
  {#each Array.from({ length: 9 }, (_, i) => i + 1) as n (n)}
    <Hst.Variant title={`Variant ${n}`}>
      <EventButton onmyevent={value => logEvent('My event', value)} /><br />
      <button onclick={event => logEvent('Click', event)}>Click</button>
    </Hst.Variant>
  {/each}
</Hst.Story>
