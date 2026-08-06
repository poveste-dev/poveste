<script lang="ts" setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <div
    class="poveste-search-loading ptw-flex ptw-items-center ptw-gap-4 ptw-pl-6 ptw-border ptw-border-transparent focus-visible:ptw-border-primary-500 ptw-h-[51px] ptw-opacity-30"
  >
    <Icon
      icon="carbon:search"
      class="flex-none ptw-w-4 ptw-h-4"
    />

    Loading...
  </div>
</template>
