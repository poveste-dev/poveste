<script setup lang="ts">
import { HstTooltip } from '@poveste/controls'
import { computed } from 'vue'
import { isMac } from '../../util/env'
import { formatKey } from '../../util/keyboard'

const props = defineProps<{
  description: string
  /** This action's shortcut, which differs per platform — `meta+shift+l`. */
  shortcut: (options: { isMac: boolean }) => string
}>()

const keys = computed(() => props.shortcut({ isMac }).split('+').map(key => formatKey(key.trim())).join(' '))
</script>

<template>
  <!-- Rendered rather than built as an HTML string and handed to `v-html`, which
       is what the tooltip directive needed and what `util/tooltip.ts` was. -->
  <HstTooltip>
    <template #content>
      <div>{{ description }}</div>
      <div class="flex items-center gap-1 mt-2 text-sm">
        <span class="border border-gray-600 px-1 rounded-sm text-gray-400">{{ keys }}</span>
      </div>
    </template>

    <slot />
  </HstTooltip>
</template>
