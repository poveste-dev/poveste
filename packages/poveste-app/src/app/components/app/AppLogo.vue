<script lang="ts" setup>
import { computed } from 'vue'
import PovesteLogoDark from '../../assets/poveste-text-dark.svg'
import PovesteLogoLight from '../../assets/poveste-text.svg'

import { customLogos, povesteConfig } from '../../util/config'
import { isDark } from '../../util/dark'

// `customLogos` holds a served URL for each logo the config names. The config's
// own entries are paths on the machine that built the book, and are not sent (#1383).
const logoUrl = computed(() => {
  if (isDark.value) {
    return customLogos?.dark ?? PovesteLogoDark
  }
  return customLogos?.light ?? PovesteLogoLight
})

const altText = computed(() => `${povesteConfig.theme.title} logo`)
</script>

<template>
  <img
    class="poveste-app-logo"
    :src="logoUrl"
    :alt="altText"
  >
</template>
