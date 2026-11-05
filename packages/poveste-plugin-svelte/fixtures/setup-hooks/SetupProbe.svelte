<script>
  import { getContext } from 'svelte'
  import { order } from './setup-probe-order.js'

  order.push(`mounted with ${getContext('from-hook')}`)
</script>
