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
    class="ptw-px-2 ptw-py-1 ptw-rounded-sm btn"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
    cursor: pointer;
}
</style>
