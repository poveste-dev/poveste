<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { povesteConfig } from '../../util/config'
import { isDark, toggleDark } from '../../util/dark'
import { onKeyboardShortcut } from '../../util/keyboard'
import { makeTooltip } from '../../util/tooltip'
import AppLogo from './AppLogo.vue'

defineEmits({
  search: () => true,
})

const themeIcon = computed(() => {
  return isDark.value ? 'carbon:moon' : 'carbon:sun'
})

onKeyboardShortcut(['ctrl+shift+d', 'meta+shift+d'], (event) => {
  event.preventDefault()
  toggleDark()
})
</script>

<template>
  <div
    class="poveste-app-header ptw-px-4 ptw-h-16 ptw-flex ptw-items-center ptw-gap-2"
  >
    <div class="ptw-py-3 sm:ptw-py-4 ptw-flex-1 ptw-h-full ptw-flex ptw-items-center ptw-pr-2">
      <a
        :href="povesteConfig.theme?.logoHref"
        target="_blank"
        class="ptw-w-full ptw-h-full ptw-flex ptw-items-center"
      >
        <AppLogo
          class="ptw-max-w-full ptw-max-h-full"
        />
      </a>
    </div>
    <div class="ptw-ml-auto ptw-flex-none ptw-flex">
      <a
        v-tooltip="makeTooltip('Search', ({ isMac }) => isMac ? 'meta+k' : 'ctrl+k')"
        class="ptw-p-2 sm:ptw-p-1 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer ptw-text-gray-900 dark:ptw-text-gray-100"
        data-test-id="search-btn"
        @click="$emit('search')"
      >
        <Icon
          icon="carbon:search"
          class="ptw-w-6 ptw-h-6 sm:ptw-w-4 sm:ptw-h-4"
        />
      </a>

      <a
        v-if="!povesteConfig.theme.hideColorSchemeSwitch"
        v-tooltip="makeTooltip('Toggle dark mode', ({ isMac }) => isMac ? 'meta+shift+d' : 'ctrl+shift+d')"
        class="ptw-p-2 sm:ptw-p-1 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer ptw-text-gray-900 dark:ptw-text-gray-100"
        @click="toggleDark()"
      >
        <Icon
          :icon="themeIcon"
          class="ptw-w-6 ptw-h-6 sm:ptw-w-4 sm:ptw-h-4"
        />
      </a>
    </div>
  </div>
</template>
