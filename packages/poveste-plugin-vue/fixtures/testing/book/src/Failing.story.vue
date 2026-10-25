<script setup lang="ts">
import Label from './Label.vue'
import Throws from './Throws.vue'
import ThrowsLater from './ThrowsLater.vue'

function rejects() {
  return Promise.reject(new Error('initState rejected on purpose'))
}
</script>

<template>
  <Story title="Failing">
    <Variant title="throws in setup">
      <Throws />
    </Variant>

    <Variant title="throws after an await">
      <ThrowsLater />
    </Variant>

    <Variant title="warns">
      <Label />
    </Variant>

    <Variant
      title="rejects in initState"
      :init-state="rejects"
    >
      <Label text="never" />
    </Variant>

    <Variant title="fine">
      <Label text="fine" />
    </Variant>
  </Story>
</template>
