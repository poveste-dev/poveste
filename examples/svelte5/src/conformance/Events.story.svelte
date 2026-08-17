<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import { logEvent } from 'poveste/client'

  export let Hst: Hst
</script>

<Hst.Story id="conformance-events" title="Conformance/Events">
  <Hst.Variant id="default" title="default">
    <button
      class="conformance-event-button"
      on:click={() => logEvent('conformance-click', { source: 'button' })}
    >
      Emit
    </button>
  </Hst.Variant>
</Hst.Story>
