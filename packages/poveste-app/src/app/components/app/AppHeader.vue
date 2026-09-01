<script setup lang="ts">
import { povesteConfig } from '../../util/config'
import AppLogo from './AppLogo.vue'
</script>

<template>
  <header
    class="poveste-app-header px-4 h-14 flex items-center gap-2"
  >
    <!-- A page needs exactly one h1, and it has to sit inside a landmark or it
         is content outside any region itself (#310). -->
    <h1 class="sr-only">
      {{ povesteConfig.theme?.title ?? 'Poveste' }}
    </h1>
    <div class="py-3 sm:py-4 flex-1 h-full flex items-center pr-2">
      <a
        :href="povesteConfig.theme?.logoHref"
        target="_blank"
        class="w-full h-full flex items-center"
      >
        <AppLogo
          class="max-w-full max-h-full"
        />
      </a>
    </div>
  </header>
</template>
