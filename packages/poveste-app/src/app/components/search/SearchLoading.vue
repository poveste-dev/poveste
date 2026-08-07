<script lang="ts" setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <div
    class="poveste-search-loading flex items-center gap-4 pl-6 border border-transparent focus-visible:border-primary-500 h-[51px] opacity-30"
  >
    <Icon
      icon="carbon:search"
      class="flex-none w-4 h-4"
    />

    Loading...
  </div>
</template>
