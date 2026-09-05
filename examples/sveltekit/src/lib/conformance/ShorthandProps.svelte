<script lang="ts">
  // Runes, where the Svelte books are otherwise all `export let` — so this is
  // the first component to reach the extractor's `$props()` branch in a real
  // book rather than only in its unit tests (#493).
  const { greeting = '' }: { greeting?: string } = $props()
</script>

<span class="conformance-shorthand-props">{greeting}</span>
