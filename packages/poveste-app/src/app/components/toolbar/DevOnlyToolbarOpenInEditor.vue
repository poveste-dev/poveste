<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { HstTooltip } from '@poveste/controls'
import { openInEditor } from '../../util/open-in-editor.js'
import TopBarChipItem from '../app/TopBarChipItem.vue'

defineProps<{
  file: string
  tooltip: string
}>()
</script>

<template>
  <HstTooltip :content="tooltip">
    <TopBarChipItem
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
  </HstTooltip>
</template>
