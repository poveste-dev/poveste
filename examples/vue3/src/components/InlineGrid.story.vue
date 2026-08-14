<script lang="ts" setup>
import BaseButton from './BaseButton.vue'
</script>

<!-- `iframeGrid: false` renders cells inline; nothing else covers that path. -->
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
