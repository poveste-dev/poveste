<script lang="ts">
  // Props as a union over `type`, as bits-ui's Accordion declares them: each member
  // has its own `onValueChange`, and the payload is one or the other (#501).
  type Props
    = | { type: 'single', value?: string, onValueChange?: (value: string) => void }
      | { type: 'multiple', value?: string[], onValueChange?: (value: string[]) => void }

  const { type }: Props = $props()
</script>

<div data-type={type}></div>
