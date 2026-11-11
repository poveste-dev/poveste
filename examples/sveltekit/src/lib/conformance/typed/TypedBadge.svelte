<script lang="ts">
  // Named as the component beside it, with a different `size`: its types must not be the other's.
  const { size }: { size?: number } = $props()
</script>

<span>size {size}</span>
