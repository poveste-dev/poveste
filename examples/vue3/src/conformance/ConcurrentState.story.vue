<script lang="ts" setup>
</script>

<template>
  <Story
    id="conformance-concurrent-state"
    title="Conformance/Concurrent state"
    :init-state="() => ({ bumps: 0, label: 'start' })"
  >
    <template #default="{ state }">
      <p class="conformance-state-label">
        {{ state.label }}
      </p>
      <p class="conformance-state-bumps">
        {{ state.bumps }}
      </p>
      <button
        class="conformance-state-bump"
        @click="state.bumps++"
      >
        Bump
      </button>
    </template>

    <template #controls="{ state }">
      <HstText
        v-model="state.label"
        title="label"
      />
    </template>
  </Story>
</template>
