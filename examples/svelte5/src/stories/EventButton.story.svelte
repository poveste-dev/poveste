<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import { logEvent } from 'poveste/client'
  import EventButton from './EventButton.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="events/EventButton">
  <EventButton onmyevent={value => logEvent('My event', value)} /><br />
  <button onclick={event => logEvent('Click', event)}>Click</button>
</Hst.Story>
