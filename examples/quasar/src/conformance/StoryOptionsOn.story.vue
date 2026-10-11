<script lang="ts" setup>
const meta = { storyOptions: true }
</script>

<template>
  <!--
    Forces its options pane on. With the reader's Story Options switch off, this
    story still shows the pane, and a story that sets nothing does not (#1261).
  -->
  <Story
    id="conformance-story-options-on"
    title="Conformance/Story options on"
    :meta="meta"
  >
    <Variant>
      <p class="conformance-story-options-on-text">
        Story options forced on
      </p>
    </Variant>
  </Story>
</template>
