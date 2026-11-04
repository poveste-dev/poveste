<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType

  // The same contract as Vue's, where the state sync wrote null over a template
  // ref just after mount (#1598). The button reads it later, as a story's own
  // code would.
  let box: HTMLElement | undefined

  function read(event: MouseEvent) {
    (event.currentTarget as HTMLElement).textContent = box ? 'held' : 'lost'
  }
</script>

<Hst.Story id="conformance-template-ref" title="Conformance/Template ref">
  <div bind:this={box} class="conformance-template-ref-box">Box</div>
  <button class="conformance-template-ref-read" onclick={read}>Read</button>
</Hst.Story>
