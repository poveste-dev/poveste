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
        <pre class="demo-value">{{ state.day }}</pre>
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
        <pre class="demo-value">{{ state.moment }}</pre>
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
        <pre class="demo-value">{{ state.empty || '(nothing)' }}</pre>
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

<style scoped>
.demo-value {
  font-size: 0.75rem;
  line-height: 1rem;
}
</style>
