<script lang="ts" setup>
import type { SandboxColorScheme } from '../../types'
import { Icon } from '@iconify/vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { povesteConfig } from '../../util/config'
import BaseCheckbox from '../base/BaseCheckbox.vue'

const previewSettings = usePreviewSettingsStore()
const settings = previewSettings.currentSettings

const colorSchemeOptions: { value: SandboxColorScheme, label: string, icon: string }[] = [
  { value: 'auto', label: 'System', icon: 'carbon:screen' },
  { value: 'light', label: 'Light', icon: 'carbon:sun' },
  { value: 'dark', label: 'Dark', icon: 'carbon:moon' },
]

// A book that hides the app color scheme switch doesn't want the preview one
// either — it keeps whatever `theme.defaultColorScheme` says.
const showColorScheme = !povesteConfig.theme.hideColorSchemeSwitch
const showDropdown = showColorScheme || !!povesteConfig.backgroundPresets.length
</script>

<template>
  <VDropdown
    v-if="showDropdown"
    placement="bottom-end"
    :skidding="6"
    class="poveste-toolbar-background flex-none"
    data-test-id="toolbar-background"
  >
    <!-- The tooltip would sit on top of the first row of the dropdown, so drop
    it while the dropdown is open. -->
    <template #default="{ shown }">
      <div
        v-tooltip="shown ? '' : 'Preview appearance'"
        class="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer text-gray-900 dark:text-gray-100 transition-colors group"
      >
        <Icon
          icon="carbon:color-palette"
          class="w-4 h-4"
        />
        <Icon
          icon="carbon:chevron-down"
          class="w-3 h-3 opacity-40 group-hover:opacity-70"
        />
      </div>
    </template>

    <template #popper="{ hide }">
      <div
        class="flex flex-col items-stretch"
        data-test-id="background-popper"
      >
        <div
          v-if="showColorScheme"
          class="flex items-stretch gap-1 px-2 pt-2"
          data-test-id="sandbox-color-scheme"
        >
          <button
            v-for="option in colorSchemeOptions"
            :key="option.value"
            :data-test-id="`sandbox-color-scheme-${option.value}`"
            class="flex-1 px-3 py-1.5 rounded flex items-center justify-center gap-1.5 cursor-pointer text-sm"
            :class="[
              settings.colorScheme === option.value
                ? 'bg-primary-500 hover:bg-primary-600 text-white dark:text-black'
                : 'bg-transparent hover:bg-primary-100 dark:hover:bg-primary-700',
            ]"
            @click="settings.colorScheme = option.value"
          >
            <Icon
              :icon="option.icon"
              class="w-4 h-4"
            />
            <span>{{ option.label }}</span>
          </button>
        </div>

        <BaseCheckbox v-model="settings.checkerboard">
          Checkerboard
        </BaseCheckbox>

        <button
          v-for="(option, index) in povesteConfig.backgroundPresets"
          :key="index"
          class="px-4 py-3 cursor-pointer text-left flex items-baseline gap-4"
          :class="[
            settings.backgroundColor === option.color
              ? 'bg-primary-500 hover:bg-primary-600 text-white dark:text-black'
              : 'bg-transparent hover:bg-primary-100 dark:hover:bg-primary-700',
          ]"
          @click="previewSettings.setBackgroundColor(option.color);hide()"
        >
          <span class="mr-auto">{{ option.label }}</span>
          <template v-if="option.color !== '$checkerboard'">
            <span class="ml-auto opacity-70">{{ option.color }}</span>
            <div
              class="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center text-xs"
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
