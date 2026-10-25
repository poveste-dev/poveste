<script setup lang="ts">
import { logEvent } from 'poveste/client'
import { onMounted, reactive } from 'vue'
import Label from './Label.vue'

const state = reactive({ text: 'from state' })

onMounted(() => {
  logEvent('mounted', {})
})
</script>

<template>
  <Story title="Passing">
    <Variant title="plain">
      <Label text="plain" />
    </Variant>

    <Variant
      title="from initState"
      :init-state="() => ({ text: 'from initState' })"
    >
      <template #default="{ state: variantState }">
        <Label :text="variantState.text" />
      </template>
    </Variant>

    <Variant title="from the setup file">
      <FromSetup />
    </Variant>

    <Variant title="with controls">
      <Label :text="state.text" />

      <template #controls>
        <HstText
          v-model="state.text"
          title="Text"
        />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Passing

A docs block, which a test only has to import.
</docs>
