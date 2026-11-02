<script setup lang="ts">
import { Button } from 'flowbite-vue'
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <Story title="Library imported">
    <Button @click="count++">
      {{ count }}
    </Button>
  </Story>
</template>
