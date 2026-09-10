<script lang="ts" setup>
import { computed } from 'vue'
import PovesteLogoDark from '../../assets/poveste-text-dark.svg'
import PovesteLogoLight from '../../assets/poveste-text.svg'

import { customLogos, povesteConfig } from '../../util/config'
import { isDark } from '../../util/dark'

// `theme.logo` is what the config asked for; `customLogos` is the resolved URL
// map from the virtual module. Two objects, so a check on one narrows nothing
// about the other — and falling back to the bundled logo beats rendering an
// `<img>` with no `src` if they ever disagree.
const logoUrl = computed(() => {
  if (isDark.value) {
    return povesteConfig.theme.logo?.dark ? customLogos?.dark ?? PovesteLogoDark : PovesteLogoDark
  }
  return povesteConfig.theme.logo?.light ? customLogos?.light ?? PovesteLogoLight : PovesteLogoLight
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
