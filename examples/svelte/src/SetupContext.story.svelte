<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import SetupContextReader from './SetupContextReader.svelte'

  export let Hst: Hst

  function setupApp({ setContext }) {
    setContext('from-setup-app', 'set by setupApp')
  }
</script>

<Hst.Story id="setup-context" title="Setup context" {setupApp}>
  <SetupContextReader />
</Hst.Story>
