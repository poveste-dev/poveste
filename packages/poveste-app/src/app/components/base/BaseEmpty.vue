<template>
  <div class="poveste-base-empty ptw-base-empty ptw-flex ptw-flex-col ptw-items-center ptw-justify-center ptw-space-y-4 ptw-py-12 ptw-h-full ptw-text-center ptw-text-gray-400  ptw-text-lg">
    <slot />
  </div>
</template>

<style scoped>
.ptw-base-empty:not(.no-animation) {
  animation: ptw-base-empty .15s .2s both;
}

@keyframes ptw-base-empty {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
</style>
