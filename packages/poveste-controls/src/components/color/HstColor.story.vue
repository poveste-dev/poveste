<script lang="ts" setup>
import HstColor from './HstColor.vue'

function initState() {
  return {
    tint: '#3366ff',
    empty: '',
  }
}
</script>

<template>
  <Story
    title="HstColor"
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
        <div
          class="demo-swatch"
          :style="{ backgroundColor: state.tint }"
        />
      </template>
      <template #controls="{ state }">
        <HstColor
          v-model="state.tint"
          title="Tint"
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
        <HstColor
          v-model="state.empty"
          title="Unset"
        />
      </template>
    </Variant>
  </Story>
</template>

<style scoped>
.demo-swatch {
  width: 4rem;
  height: 4rem;
  border-radius: 0.25rem;
}

.demo-value {
  font-size: 0.75rem;
  line-height: 1rem;
}
</style>
