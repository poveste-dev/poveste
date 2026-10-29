<script setup lang="ts">
import type { ToneProps } from './tone-types'

defineProps<ToneProps>()
</script>

<template>
  <span>{{ label }}</span>
</template>
