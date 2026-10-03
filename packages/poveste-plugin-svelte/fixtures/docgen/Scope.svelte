<script lang="ts">
  import { createScope } from './Scope.svelte.js'

  interface Props {
    /** Whether focus is trapped inside. */
    trapped?: boolean
  }
  const { trapped = true }: Props = $props()
  const scope = createScope()
</script>

<div data-trapped={trapped}>{scope.name}</div>
