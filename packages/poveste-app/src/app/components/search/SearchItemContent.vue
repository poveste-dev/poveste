<script lang="ts" setup>
import type { SearchResult } from '../../types.js'
import { Icon } from '@iconify/vue'
import BaseIcon from '../base/BaseIcon.vue'

defineProps<{
  result: SearchResult
  selected: boolean
}>()

const defaultIcons = {
  story: 'carbon:cube',
  variant: 'carbon:cube',
}

const kindLabels = {
  story: 'Story',
  variant: 'Variant',
  command: 'Command',
}
</script>

<template>
  <BaseIcon
    :icon="result.icon ?? defaultIcons[result.kind]"
    class="w-4 h-4"
    :class="[
      !selected ? [
        result.iconColor
          ? 'bind-icon-color'
          : {
            'text-primary-500': result.kind === 'story',
            'text-gray-500': result.kind === 'variant',
          },
      ] : [],
      {
        'colorize-black': selected,
      },
    ]"
  />
  <div class="flex-1">
    <div class="flex">
      {{ result.title }}
      <span class="ml-auto opacity-40">
        {{ kindLabels[result.kind] }}
      </span>
    </div>

    <div
      v-if="result.path?.length"
      class="flex items-center gap-0.5 opacity-60"
    >
      <div
        v-for="(p, index) of result.path"
        :key="index"
        class="flex items-center gap-0.5"
      >
        <Icon
          v-if="index > 0"
          icon="carbon:chevron-right"
          class="w-4 h-4 mt-0.5 opacity-50"
        />
        <span>{{ p }}</span>
      </div>
    </div>
  </div>
</template>
