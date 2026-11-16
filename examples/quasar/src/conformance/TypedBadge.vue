<script setup lang="ts">
import type { TypedBadgeProps } from './typed-badge'

defineProps<TypedBadgeProps>()
</script>

<template>
  <span>{{ label }} {{ size }} {{ tone }} {{ level }}</span>
</template>
