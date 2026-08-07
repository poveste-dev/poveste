<script lang="ts" setup>
import { computed } from 'vue'
import { formatKey } from '../../util/keyboard.js'

const props = defineProps<{
  shortcut: string
}>()

const formatted = computed(() => props.shortcut.split('+').map(k => formatKey(k.trim())).join(' '))
</script>

<template>
  <span class="poveste-base-keyboard-shortcut border border-current opacity-50 px-1 rounded-sm">
    {{ formatted }}
  </span>
</template>
