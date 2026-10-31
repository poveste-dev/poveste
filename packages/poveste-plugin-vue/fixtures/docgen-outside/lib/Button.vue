<script setup lang="ts">
import type { ButtonProps } from './button-props'

defineProps<ButtonProps>()
</script>

<template>
  <button>{{ label }}</button>
</template>
