<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { povesteConfig } from '../../util/config'
import BaseCheckbox from '../base/BaseCheckbox.vue'

const settings = usePreviewSettingsStore().currentSettings
</script>

<template>
  <!-- Responsive size -->
  <VDropdown
    placement="bottom-end"
    :skidding="6"
    :disabled="!povesteConfig.responsivePresets?.length"
    class="poveste-toolbar-responsive-size ptw-flex-none"
  >
    <div
      v-tooltip="'Responsive sizes'"
      class="ptw-flex ptw-items-center ptw-gap-1 ptw-px-2.5 ptw-py-1.5 ptw-text-gray-900 dark:ptw-text-gray-100 ptw-transition-colors ptw-group"
      :class="{
        'hover:ptw-bg-white/50 dark:hover:ptw-bg-white/10 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer': povesteConfig.responsivePresets?.length,
      }"
    >
      <Icon
        icon="carbon:devices"
        class="ptw-w-4 ptw-h-4"
      />
      <Icon
        icon="carbon:chevron-down"
        class="ptw-w-3 ptw-h-3 ptw-opacity-40 group-hover:ptw-opacity-70"
      />
    </div>

    <template #popper="{ hide }">
      <div class="ptw-flex ptw-flex-col ptw-items-stretch">
        <BaseCheckbox v-model="settings.rotate">
          Rotate
        </BaseCheckbox>

        <div class="ptw-flex ptw-items-center ptw-gap-2 ptw-px-4 ptw-py-3">
          <input
            v-model.number="settings.responsiveWidth"
            v-tooltip="'Responsive width (px)'"
            type="number"
            class="ptw-bg-transparent ptw-border ptw-border-gray-200 dark:ptw-border-gray-850 ptw-rounded ptw-w-20 ptw-opacity-50 focus:ptw-opacity-100 ptw-flex-1 ptw-min-w-0"
            step="16"
            placeholder="Auto"
          >
          <span class="ptw-opacity-50">×</span>
          <input
            v-model.number="settings.responsiveHeight"
            v-tooltip="'Responsive height (px)'"
            type="number"
            class="ptw-bg-transparent ptw-border ptw-border-gray-200 dark:ptw-border-gray-850 ptw-rounded ptw-w-20 ptw-opacity-50 focus:ptw-opacity-100 ptw-flex-1 ptw-min-w-0"
            step="16"
            placeholder="Auto"
          >
        </div>

        <button
          v-for="(preset, index) in povesteConfig.responsivePresets"
          :key="index"
          class="ptw-px-4 ptw-py-3 ptw-cursor-pointer ptw-text-left ptw-flex ptw-gap-4"
          :class="[
            settings.responsiveWidth === preset.width && settings.responsiveHeight === preset.height
              ? 'ptw-bg-primary-500 hover:ptw-bg-primary-600 ptw-text-white dark:ptw-text-black'
              : 'ptw-bg-transparent hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-700',
          ]"
          @click="settings.responsiveWidth = preset.width;settings.responsiveHeight = preset.height;hide()"
        >
          {{ preset.label }}
          <span class="ptw-ml-auto ptw-opacity-70 ptw-flex ptw-gap-1">
            <span v-if="preset.width">{{ preset.width }}<span v-if="!preset.height">px</span></span>
            <span v-if="preset.width && preset.height">x</span>
            <span v-if="preset.height">{{ preset.height }}<span v-if="!preset.width">px</span></span>
          </span>
        </button>
      </div>
    </template>
  </VDropdown>
</template>
