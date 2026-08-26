<script setup lang="ts">
import Throws from './Throws.vue'
</script>

<template>
  <Story id="conformance-throws" title="Conformance/Throws">
    <Variant id="throwing" title="throwing">
      <Throws />
    </Variant>
    <Variant id="healthy" title="healthy">
      <div class="conformance-throws-healthy">
        renders
      </div>
    </Variant>
  </Story>
</template>
