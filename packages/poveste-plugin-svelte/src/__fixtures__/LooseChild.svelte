<script>
  import Variant from '../collect/Variant.svelte'

  export let id = null
</script>

<Variant id={id ?? undefined} title="Solo" />
