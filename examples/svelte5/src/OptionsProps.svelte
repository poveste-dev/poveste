<script>
  // No annotations, so the types come from the defaults — the extractor's other
  // source, and all an untyped Svelte component gives it. Svelte has no Options
  // API; what matches across the books is the control the panel shows.
  export let label = 'options'
  export let count = 2
</script>

<span class="conformance-options-props">{label}/{count}</span>
