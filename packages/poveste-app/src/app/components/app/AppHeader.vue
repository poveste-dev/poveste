<script setup lang="ts">
import { povesteConfig } from '../../util/config'
import AppLogo from './AppLogo.vue'
</script>

<template>
  <div
    class="poveste-app-header ptw-px-4 ptw-h-14 ptw-flex ptw-items-center ptw-gap-2"
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
  </div>
</template>
