<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    /** The text on the button. */
    label: string
  }
  const { label, ...rest }: Props = $props()
</script>

<button {...rest}>{label}</button>
