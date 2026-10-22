<script
  setup
  lang="ts"
  generic="T extends string | number = string, M extends boolean = false"
>
defineProps<{
  /** The value chosen, or values when `multiple`. */
  modelValue?: M extends true ? T[] : T
  multiple?: M
}>()
</script>

<template>
  <div />
</template>
