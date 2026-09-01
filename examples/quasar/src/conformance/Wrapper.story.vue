<template>
  <Story
    id="conformance-wrapper"
    title="Conformance/Wrapper"
    :meta="{ wrapper: false }"
  >
    <Variant
      id="story-meta"
      title="story meta"
    >
      <p class="conformance-wrapper-text">
        Story-level wrapper meta
      </p>
    </Variant>
    <Variant
      id="variant-meta"
      title="variant meta"
      :meta="{ wrapper: true }"
    >
      <p class="conformance-wrapper-text">
        Variant-level wrapper meta
      </p>
    </Variant>
  </Story>
</template>
