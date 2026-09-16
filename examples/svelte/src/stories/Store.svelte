<script lang="ts">
  import { myValue } from '../lib-store.js'
</script>

<button onclick={() => myValue.update(value => value + 1)}>+1</button>
<span>{$myValue}</span>
