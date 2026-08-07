<script lang="ts" setup>
defineProps({
  bgcolorselect: {
    type: String,
    default: null,
  },
  txtcolorselect: {
    type: String,
    default: null,
  },
})
</script>

<template>
  <button
    :style="{ background: bgcolorselect, color: txtcolorselect }"
    class="px-2 py-1 rounded-sm btn"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
    cursor: pointer;
}
</style>
