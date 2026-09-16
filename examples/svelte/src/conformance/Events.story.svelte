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
    <!-- A second name, so the panel is checked for telling events apart
    rather than only for counting them. -->
    <button
      class="conformance-event-other"
      on:click={() => logEvent('conformance-other', { source: 'other' })}
    >
      Emit other
    </button>
  </Hst.Variant>
</Hst.Story>
