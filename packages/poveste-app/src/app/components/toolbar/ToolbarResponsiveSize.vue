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
    class="poveste-toolbar-responsive-size flex-none"
  >
    <div
      v-tooltip="'Responsive sizes'"
      class="flex items-center gap-1 px-2.5 py-1.5 text-gray-900 dark:text-gray-100 transition-colors group"
      :class="{
        'hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer': povesteConfig.responsivePresets?.length,
      }"
    >
      <Icon
        icon="carbon:devices"
        class="w-4 h-4"
      />
      <Icon
        icon="carbon:chevron-down"
        class="w-3 h-3 opacity-40 group-hover:opacity-70"
      />
    </div>

    <template #popper="{ hide }">
      <div class="flex flex-col items-stretch">
        <BaseCheckbox v-model="settings.rotate">
          Rotate
        </BaseCheckbox>

        <div class="flex items-center gap-2 px-4 py-3">
          <input
            v-model.number="settings.responsiveWidth"
            v-tooltip="'Responsive width (px)'"
            type="number"
            class="bg-transparent border border-gray-200 dark:border-gray-850 rounded w-20 opacity-50 focus:opacity-100 flex-1 min-w-0"
            step="16"
            placeholder="Auto"
          >
          <span class="opacity-50">×</span>
          <input
            v-model.number="settings.responsiveHeight"
            v-tooltip="'Responsive height (px)'"
            type="number"
            class="bg-transparent border border-gray-200 dark:border-gray-850 rounded w-20 opacity-50 focus:opacity-100 flex-1 min-w-0"
            step="16"
            placeholder="Auto"
          >
        </div>

        <button
          v-for="(preset, index) in povesteConfig.responsivePresets"
          :key="index"
          class="px-4 py-3 cursor-pointer text-left flex gap-4"
          :class="[
            settings.responsiveWidth === preset.width && settings.responsiveHeight === preset.height
              ? 'bg-primary-500 hover:bg-primary-600 text-white dark:text-black'
              : 'bg-transparent hover:bg-primary-100 dark:hover:bg-primary-700',
          ]"
          @click="settings.responsiveWidth = preset.width;settings.responsiveHeight = preset.height;hide()"
        >
          {{ preset.label }}
          <span class="ml-auto opacity-70 flex gap-1">
            <span v-if="preset.width">{{ preset.width }}<span v-if="!preset.height">px</span></span>
            <span v-if="preset.width && preset.height">x</span>
            <span v-if="preset.height">{{ preset.height }}<span v-if="!preset.width">px</span></span>
          </span>
        </button>
      </div>
    </template>
  </VDropdown>
</template>
