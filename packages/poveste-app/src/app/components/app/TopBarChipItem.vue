<template>
  <!-- Without an href this is not a link, so `aria-label` on it is prohibited and
       it has no accessible role. Chip items are used both ways (#310). -->
  <a
    :role="$attrs.href ? undefined : 'button'"
    class="poveste-top-bar-chip-item flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/50 active:bg-white/70 dark:hover:bg-white/10 dark:active:bg-white/15 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer text-gray-900 dark:text-gray-100 transition-colors"
  >
    <slot />
  </a>
</template>
