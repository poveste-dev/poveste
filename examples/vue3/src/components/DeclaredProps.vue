<script lang="ts" setup>
// The runtime spelling, whose declared types survive a production build. No
// defaults: with one, a broken `declaredType` would be covered for by inferring
// the same answer from the default, which is the hole this exists to close
// (#493).
defineProps({
  label: { type: String },
  count: { type: Number },
  enabled: { type: Boolean },
})
</script>

<template>
  <span class="conformance-declared-props">{{ label }}/{{ count }}/{{ enabled }}</span>
</template>
