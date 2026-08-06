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
    class="ptw-w-4 ptw-h-4"
    :class="[
      !selected ? [
        result.iconColor
          ? 'bind-icon-color'
          : {
            'ptw-text-primary-500': result.kind === 'story',
            'ptw-text-gray-500': result.kind === 'variant',
          },
      ] : [],
      {
        'colorize-black': selected,
      },
    ]"
  />
  <div class="ptw-flex-1">
    <div class="ptw-flex">
      {{ result.title }}
      <span class="ptw-ml-auto ptw-opacity-40">
        {{ kindLabels[result.kind] }}
      </span>
    </div>

    <div
      v-if="result.path?.length"
      class="ptw-flex ptw-items-center ptw-gap-0.5 ptw-opacity-60"
    >
      <div
        v-for="(p, index) of result.path"
        :key="index"
        class="ptw-flex ptw-items-center ptw-gap-0.5"
      >
        <Icon
          v-if="index > 0"
          icon="carbon:chevron-right"
          class="ptw-w-4 ptw-h-4 ptw-mt-0.5 ptw-opacity-50"
        />
        <span>{{ p }}</span>
      </div>
    </div>
  </div>
</template>
