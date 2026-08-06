<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'

const settings = usePreviewSettingsStore().currentSettings
</script>

<template>
  <a
    v-tooltip="`Switch to text direction ${settings.textDirection === 'ltr' ? 'Right to Left' : 'Left to Right'}`"
    class="poveste-toolbar-text-direction ptw-flex ptw-items-center ptw-gap-1 ptw-h-full ptw-px-2 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
    @click="settings.textDirection = settings.textDirection === 'ltr' ? 'rtl' : 'ltr'"
  >
    <Icon
      :icon="settings.textDirection === 'ltr' ? 'fluent:text-paragraph-direction-right-16-regular' : 'fluent:text-paragraph-direction-left-16-regular'"
      class="ptw-w-4 ptw-h-4"
    />
  </a>
</template>
