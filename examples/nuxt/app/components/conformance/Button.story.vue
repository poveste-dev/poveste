<script lang="ts" setup>
import { reactive } from 'vue'

const state = reactive({
  text: 'Click me',
  disabled: false,
  size: 'medium',
})

defineExpose({ state })
</script>

<template>
  <Story
    id="conformance-button"
    title="Conformance/Button"
  >
    <template #controls>
      <HstText
        v-model="state.text"
        title="Text"
      />
      <HstCheckbox
        v-model="state.disabled"
        title="Disabled"
      />
      <HstSelect
        v-model="state.size"
        :options="['small', 'medium', 'large']"
        title="Size"
      />
    </template>

    <Variant
      id="default"
      title="default"
    >
      <button
        class="conformance-button"
        :disabled="state.disabled"
      >
        {{ state.text }}
      </button>
    </Variant>
  </Story>
</template>
