<script lang="ts" setup>
// `layout.isolate` opts a story out of sandbox reuse: every render gets a
// fresh document (#240). Thirty variants — enough to scroll a window past.
const count = 30
</script>

<template>
  <Story
    id="conformance-isolated-grid"
    title="Conformance/Isolated grid"
    :layout="{ type: 'grid', width: 200, isolate: true }"
  >
    <Variant
      v-for="n in count"
      :id="`v${n}`"
      :key="n"
      :title="`Variant ${n}`"
    >
      <button
        class="conformance-isolated-grid-button"
        style="height: 48px"
      >
        Button {{ n }}
      </button>
    </Variant>
  </Story>
</template>
