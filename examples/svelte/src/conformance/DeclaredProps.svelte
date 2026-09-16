<script lang="ts">
  // Svelte reads these off the source at build time rather than off a rendered
  // vnode, so it needs no counterpart to Vue's two spellings. What has to match
  // is the control the panel shows (#493).
  export let label: string = ''
  export let count: number = 0
  export let enabled: boolean = false
</script>

<span class="conformance-declared-props">{label}/{count}/{enabled}</span>
