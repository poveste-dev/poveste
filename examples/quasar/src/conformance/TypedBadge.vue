<script setup lang="ts">
import type { TypedBadgeProps } from './typed-badge'

withDefaults(defineProps<TypedBadgeProps>(), { outlined: true, shape: 'round' })
</script>

<template>
  <span>{{ label }} {{ size }} {{ tone }} {{ level }} {{ outlined ? 'outlined' : 'filled' }} {{ shape }}</span>
</template>
