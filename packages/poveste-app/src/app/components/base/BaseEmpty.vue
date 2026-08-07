<template>
  <div class="poveste-base-empty base-empty flex flex-col items-center justify-center space-y-4 py-12 h-full text-center text-gray-400  text-lg">
    <slot />
  </div>
</template>

<style scoped>
.base-empty:not(.no-animation) {
  animation: base-empty .15s .2s both;
}

@keyframes base-empty {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
</style>
