<script>
  // Svelte's own development warning, printed with `console.warn`.
  const raw = { n: 1 }
  const proxied = $state(raw)
  const same = proxied === raw
</script>

<p>{same}</p>
