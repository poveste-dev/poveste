<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { openInEditor } from '../../util/open-in-editor.js'
import TopBarChipItem from '../app/TopBarChipItem.vue'

defineProps<{
  file: string
  tooltip: string
}>()
</script>

<template>
  <TopBarChipItem
    v-tooltip="tooltip"
    aria-label="Open story in editor"
    target="_blank"
    class="poveste-toolbar-open-in-editor"
    @click="openInEditor(file)"
  >
    <Icon
      icon="carbon:script-reference"
      class="w-4 h-4"
    />
  </TopBarChipItem>
</template>
