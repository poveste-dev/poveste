<script lang="ts" setup>
import { computed } from 'vue'
import { formatKey } from '../../util/keyboard.js'

const props = defineProps<{
  shortcut: string
}>()

const formatted = computed(() => props.shortcut.split('+').map(k => formatKey(k.trim())).join(' '))
</script>

<template>
  <span class="poveste-base-keyboard-shortcut ptw-border ptw-border-current ptw-opacity-50 ptw-px-1 ptw-rounded-sm">
    {{ formatted }}
  </span>
</template>
