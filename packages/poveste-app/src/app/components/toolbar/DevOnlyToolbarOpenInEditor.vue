<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { openInEditor } from '../../util/open-in-editor.js'

defineProps<{
  file: string
  tooltip: string
}>()
</script>

<template>
  <a
    v-tooltip="tooltip"
    target="_blank"
    class="poveste-toolbar-open-in-editor ptw-flex ptw-items-center ptw-gap-1 ptw-h-full ptw-px-2 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
    @click="openInEditor(file)"
  >
    <Icon
      icon="carbon:script-reference"
      class="ptw-w-4 ptw-h-4"
    />
  </a>
</template>
