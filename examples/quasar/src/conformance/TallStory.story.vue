<script lang="ts" setup>
// Far taller than any preview area, so the story overflows it whatever the
// window size. The preview must scroll rather than clip (#258).
//
// `iframe: false` on purpose: with one, the story scrolls inside the sandbox
// document and never overflows the host, which is where the clipping was.
const rows = 120
</script>

<template>
  <Story
    id="conformance-tall-story"
    title="Conformance/Tall story"
    :layout="{ type: 'single', iframe: false }"
  >
    <Variant
      id="tall"
      title="Tall"
    >
      <div class="conformance-tall-story">
        <p
          v-for="n in rows"
          :key="n"
          style="height: 40px; margin: 0"
        >
          Row {{ n }}
        </p>
        <p
          class="conformance-tall-story-end"
          style="height: 40px; margin: 0"
        >
          End
        </p>
      </div>
    </Variant>
  </Story>
</template>
