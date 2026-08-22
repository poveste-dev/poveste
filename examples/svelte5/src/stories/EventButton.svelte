<script lang="ts">
  export let onmyevent: ((value: { a: string, b: string }) => void) | undefined

  let value1 = 'Hello'
  let value2 = 'World'
</script>

<input bind:value={value1} type="text" />
<input bind:value={value2} type="text" />
<button onclick={() => onmyevent?.({ a: value1, b: value2 })}>Send</button>
