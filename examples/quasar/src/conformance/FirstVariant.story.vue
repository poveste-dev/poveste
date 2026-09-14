<template>
  <!--
    Two variants and no `layout`, so the story opens in the single-variant view
    and nothing selects a variant for the reader but the app. One variant would
    be selected by a different clause and a grid renders every variant at once,
    so neither shape can fail the way this story is here to catch (#724).
  -->
  <Story
    id="conformance-first-variant"
    title="Conformance/First variant"
  >
    <Variant
      id="first"
      title="first"
    >
      <p class="conformance-first-variant-text">
        First variant
      </p>
    </Variant>
    <Variant
      id="second"
      title="second"
    >
      <p class="conformance-first-variant-text">
        Second variant
      </p>
    </Variant>
  </Story>
</template>
