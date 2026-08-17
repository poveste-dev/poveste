<script lang="ts" setup>
import { logEvent } from 'poveste/client'
</script>

<template>
  <Story
    id="conformance-events"
    title="Conformance/Events"
  >
    <Variant
      id="default"
      title="default"
    >
      <button
        class="conformance-event-button"
        @click="logEvent('conformance-click', { source: 'button' })"
      >
        Emit
      </button>
    </Variant>
  </Story>
</template>
