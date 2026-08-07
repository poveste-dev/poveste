<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { povesteConfig } from '../../util/config'
import BaseCheckbox from '../base/BaseCheckbox.vue'

const previewSettings = usePreviewSettingsStore()
const settings = previewSettings.currentSettings
</script>

<template>
  <VDropdown
    v-if="povesteConfig.backgroundPresets.length"
    placement="bottom-end"
    :skidding="6"
    class="poveste-toolbar-background ptw-flex-none"
    data-test-id="toolbar-background"
  >
    <div
      v-tooltip="'Background color'"
      class="ptw-flex ptw-items-center ptw-gap-1 ptw-px-2.5 ptw-py-1.5 hover:ptw-bg-white/50 dark:hover:ptw-bg-white/10 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer ptw-text-gray-900 dark:ptw-text-gray-100 ptw-transition-colors ptw-group"
    >
      <Icon
        icon="carbon:color-palette"
        class="ptw-w-4 ptw-h-4"
      />
      <Icon
        icon="carbon:chevron-down"
        class="ptw-w-3 ptw-h-3 ptw-opacity-40 group-hover:ptw-opacity-70"
      />
    </div>

    <template #popper="{ hide }">
      <div
        class="ptw-flex ptw-flex-col ptw-items-stretch"
        data-test-id="background-popper"
      >
        <BaseCheckbox v-model="settings.checkerboard">
          Checkerboard
        </BaseCheckbox>

        <button
          v-for="(option, index) in povesteConfig.backgroundPresets"
          :key="index"
          class="ptw-px-4 ptw-py-3 ptw-cursor-pointer ptw-text-left ptw-flex ptw-items-baseline ptw-gap-4"
          :class="[
            settings.backgroundColor === option.color
              ? 'ptw-bg-primary-500 hover:ptw-bg-primary-600 ptw-text-white dark:ptw-text-black'
              : 'ptw-bg-transparent hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-700',
          ]"
          @click="previewSettings.setBackgroundColor(option.color);hide()"
        >
          <span class="ptw-mr-auto">{{ option.label }}</span>
          <template v-if="option.color !== '$checkerboard'">
            <span class="ptw-ml-auto ptw-opacity-70">{{ option.color }}</span>
            <div
              class="ptw-w-4 ptw-h-4 ptw-rounded-full ptw-border ptw-border-black/20 dark:ptw-border-white/20 ptw-flex ptw-items-center ptw-justify-center ptw-text-xs"
              :style="{
                backgroundColor: option.color,
                color: option.contrastColor,
              }"
            >
              <span v-if="option.contrastColor">a</span>
            </div>
          </template>
        </button>
      </div>
    </template>
  </VDropdown>
</template>

<style scoped>
.bind-preview-bg {
  background-color: v-bind('settings.backgroundColor');
  color: v-bind('contrastColor');
}
</style>
