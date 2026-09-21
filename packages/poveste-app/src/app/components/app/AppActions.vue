<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { povesteConfig } from '../../util/config'
import { isDark, toggleDark } from '../../util/dark'
import { isMobile } from '../../util/responsive'
import ShortcutTooltip from './ShortcutTooltip.vue'
import TopBarChip from './TopBarChip.vue'
import TopBarChipItem from './TopBarChipItem.vue'

defineEmits({
  search: () => true,
  layout: () => true,
})

const themeIcon = computed(() => {
  return isDark.value ? 'carbon:moon' : 'carbon:sun'
})
</script>

<template>
  <TopBarChip>
    <ShortcutTooltip
      v-if="!isMobile"
      description="Layout"
      :shortcut="({ isMac }) => isMac ? 'meta+shift+l' : 'ctrl+shift+l'"
    >
      <TopBarChipItem
        aria-label="Open layout customization"
        data-testid="layout-btn"
        @click="$emit('layout')"
      >
        <Icon
          icon="carbon:panel-expansion"
          class="w-4 h-4"
        />
      </TopBarChipItem>
    </ShortcutTooltip>

    <ShortcutTooltip
      description="Search"
      :shortcut="({ isMac }) => isMac ? 'meta+k' : 'ctrl+k'"
    >
      <TopBarChipItem
        aria-label="Search stories"
        data-testid="search-btn"
        @click="$emit('search')"
      >
        <Icon
          icon="carbon:search"
          class="w-4 h-4"
        />
      </TopBarChipItem>
    </ShortcutTooltip>

    <ShortcutTooltip
      v-if="!povesteConfig.theme.hideColorSchemeSwitch"
      description="Toggle dark mode"
      :shortcut="({ isMac }) => isMac ? 'meta+shift+d' : 'ctrl+shift+d'"
    >
      <TopBarChipItem
        aria-label="Toggle dark mode"
        @click="toggleDark()"
      >
        <Icon
          :icon="themeIcon"
          class="w-4 h-4"
        />
      </TopBarChipItem>
    </ShortcutTooltip>
  </TopBarChip>
</template>
