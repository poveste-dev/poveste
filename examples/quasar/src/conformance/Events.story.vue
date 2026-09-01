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
      <!-- A second name, so the panel is checked for telling events apart
      rather than only for counting them. -->
      <button
        class="conformance-event-other"
        @click="logEvent('conformance-other', { source: 'other' })"
      >
        Emit other
      </button>
    </Variant>
  </Story>
</template>
