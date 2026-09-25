<script lang="ts" setup>
// No controls slot, on purpose. With none, the panel builds a control per state
// key out of `initState` alone — a documented feature with, until this story, no
// conformance coverage at all, which is how a Svelte book came to show "No
// controls available" for a story a Vue book gives three controls.
function initState() {
  return {
    label: 'start',
    count: 1,
    enabled: false,
  }
}
</script>

<template>
  <Story
    id="conformance-init-state-controls"
    title="Conformance/Init state controls"
    :init-state="initState"
  >
    <template #default="{ state }">
      <p class="conformance-init-label">
        {{ state.label }}
      </p>
      <p class="conformance-init-count">
        {{ state.count }}
      </p>
      <p class="conformance-init-enabled">
        {{ String(state.enabled) }}
      </p>
    </template>
  </Story>
</template>
