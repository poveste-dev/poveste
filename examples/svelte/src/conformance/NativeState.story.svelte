<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst

  const initState = () => ({ label: 'alpha', bumps: 0 })
</script>

<Hst.Story
  id="conformance-native-state"
  title="Conformance/Native state"
  layout={{ type: 'single', iframe: false }}
  {initState}
>
  <Hst.Variant id="alpha" title="Alpha">
    {#snippet children({ state })}
      <p class="conformance-native-label">{state.label}</p>
      <p class="conformance-native-bumps">{state.bumps}</p>
      <button class="conformance-native-bump" onclick={() => state.bumps++}>Bump</button>
      <button class="conformance-native-rename" onclick={() => (state.label = 'from story')}>Rename</button>
    {/snippet}
  </Hst.Variant>

  <Hst.Variant id="beta" title="Beta">
    {#snippet children({ state })}
      <p class="conformance-native-label">{state.label}</p>
      <p class="conformance-native-bumps">{state.bumps}</p>
    {/snippet}
  </Hst.Variant>
</Hst.Story>
