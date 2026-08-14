<script lang="ts" setup>
import BaseButton from './BaseButton.vue'
</script>

<!--
  `iframeGrid: false` renders grid cells inline rather than one sandbox per
  cell. Nothing else in the examples exercises that path, which is how the grid
  came to disagree with the other two about dark classes (#126).
-->
<template>
  <Story
    title="InlineGrid"
    :layout="{ type: 'grid', width: 200, iframeGrid: false }"
  >
    <Variant
      v-for="n in 2"
      :key="n"
      :title="`Variant ${n}`"
    >
      <BaseButton>
        Click me {{ n }}
      </BaseButton>
    </Variant>
  </Story>
</template>
