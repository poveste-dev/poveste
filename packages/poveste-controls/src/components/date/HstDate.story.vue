<script lang="ts" setup>
import HstDate from './HstDate.vue'

function initState() {
  return {
    day: '2026-09-20',
    moment: '2026-09-20T14:30',
    empty: '',
  }
}
</script>

<template>
  <Story
    title="HstDate"
    group="controls"
    :layout="{
      type: 'grid',
      width: '100%',
    }"
  >
    <Variant
      title="default"
      :init-state="initState"
    >
      <template #default="{ state }">
        <pre class="text-xs">{{ state.day }}</pre>
      </template>
      <template #controls="{ state }">
        <HstDate
          v-model="state.day"
          title="Day"
        />
      </template>
    </Variant>

    <Variant
      title="with-an-hour"
      :init-state="initState"
    >
      <template #default="{ state }">
        <pre class="text-xs">{{ state.moment }}</pre>
      </template>
      <template #controls="{ state }">
        <HstDate
          v-model="state.moment"
          title="Moment"
          time
        />
      </template>
    </Variant>

    <Variant
      title="empty"
      :init-state="initState"
    >
      <template #default="{ state }">
        <pre class="text-xs">{{ state.empty || '(nothing)' }}</pre>
      </template>
      <template #controls="{ state }">
        <HstDate
          v-model="state.empty"
          title="Unset"
        />
      </template>
    </Variant>
  </Story>
</template>
