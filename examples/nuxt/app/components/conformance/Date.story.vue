<script lang="ts" setup>
// Titled "Date control" rather than "Date": the vue example routes its tree
// groups by a regex on the title, and distinct words keep a locator filtering on
// one control from matching another. See Controls.story.vue for the long version.
function initState() {
  return {
    day: '2026-09-20',
    moment: '2026-09-20T14:30',
    unset: '',
  }
}
</script>

<template>
  <Story
    id="conformance-date"
    title="Conformance/Date control"
    :init-state="initState"
  >
    <template #default="{ state }">
      <pre class="conformance-date-state">{{ JSON.stringify(state, null, 2) }}</pre>
    </template>

    <template #controls="{ state }">
      <HstDate
        v-model="state.day"
        title="Day"
      />
      <HstDate
        v-model="state.moment"
        title="Moment"
        time
      />

      <!-- Empty, and showing an hour: the one order in which the value cannot
           hold what is typed, because an ISO string has nowhere to put an hour
           until it has a day (#63). -->
      <HstDate
        v-model="state.unset"
        title="Unset"
        time
      />
    </template>
  </Story>
</template>
