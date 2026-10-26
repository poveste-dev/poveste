<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import CeText from './CeText.svelte'
  import './element'

  export let Hst: Hst

  // Shared through `state`, which is how the panel tree and the story body see
  // the same value. A plain `let` is not shared between them.
  const initState = () => ({
    viaElement: 'initial element value',
    viaBridge: 'initial bridge value',
  })
</script>

<Hst.Story title="Spike 348 custom element">
  <Hst.Variant title="default" {initState}>
    {#snippet controls({ state })}
      <!-- Custom element behind a thin Svelte wrapper: no Vue app booted here. -->
      <CeText bind:value={state.viaElement} title="custom element + thin wrapper" />

      <!-- Slots: light DOM (no shadow root) against native shadow projection. -->
      <pvt-slot-light title="light">
        <em data-authored="svelte">authored in the story</em>
        <b slot="actions" data-authored="svelte-actions">action content</b>
      </pvt-slot-light>

      <pvt-slot-shadow title="shadow">
        <em data-authored="svelte">authored in the story</em>
        <b slot="actions" data-authored="svelte-actions">action content</b>
      </pvt-slot-shadow>

      <pvt-select-light title="select light">
        <b slot="actions" data-authored="sel-light">ACTION</b>
      </pvt-select-light>

      <pvt-select-shadow title="select shadow">
        <b slot="actions" data-authored="sel-shadow">ACTION</b>
      </pvt-select-shadow>

      <!-- The existing bridge, same panel, for comparison. -->
      <Hst.Text bind:value={state.viaBridge} title="through the Vue bridge" />
    {/snippet}

    {#snippet children({ state })}
      <div data-slot="spike-readout">
        <p>element: <span data-testid="element-value">{state.viaElement}</span></p>
        <p>bridge: <span data-testid="bridge-value">{state.viaBridge}</span></p>
      </div>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
