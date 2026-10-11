<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  // Kit 3's replacement for `$lib`: the package's own `imports` field.
  import { greeting } from '#lib'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story id="kit-3" title="Kit 3">
  <Hst.Variant id="imports" title="#lib">
    <p data-testid="greeting">{greeting('SvelteKit 3')}</p>
  </Hst.Variant>
  <Hst.Variant id="static" title="files.assets">
    <img data-testid="logo" src="/logo.svg" alt="Served from the project's assets directory" />
  </Hst.Variant>
</Hst.Story>
