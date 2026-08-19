<template>
  <Story
    id="conformance-grid"
    title="Conformance/Grid"
    :layout="{ type: 'grid', width: 200 }"
  >
    <Variant
      id="one"
      title="one"
    >
      <p class="conformance-text">
        One
      </p>
    </Variant>
    <Variant
      id="two"
      title="two"
    >
      <p class="conformance-text">
        Two
      </p>
    </Variant>
    <Variant
      id="three"
      title="three"
    >
      <p class="conformance-text">
        Three
      </p>
    </Variant>
  </Story>
</template>

<style scoped>
.conformance-text {
  color: var(--poveste-contrast-color);
}
</style>
