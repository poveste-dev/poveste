<script lang="ts" setup>
// Bench fixture (#197): same cell as its siblings, only the variant count
// differs. Ignored by the example config unless POVESTE_BENCH=1.
const count = 10
</script>

<template>
  <Story
    id="bench-grid-10"
    title="Bench/Grid 10"
    :layout="{ type: 'grid', width: 200 }"
  >
    <Variant
      v-for="n in count"
      :id="`v${n}`"
      :key="n"
      :title="`Variant ${n}`"
    >
      <button style="height: 48px">
        Button {{ n }}
      </button>
    </Variant>
  </Story>
</template>
