<template>
  <Story
    id="conformance-dark"
    title="Conformance/Dark"
  >
    <Variant
      id="default"
      title="default"
    >
      <p class="conformance-dark-text">
        Styled by the consumer's own dark rule
      </p>
      <p class="conformance-dark-only">
        Dark only
      </p>
    </Variant>
  </Story>
</template>

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. -->
<style scoped>
.conformance-dark-only { display: none }

.dark .conformance-dark-text,
.my-dark .conformance-dark-text {
  color: rgb(255, 255, 255);
  font-weight: 700;
}

.dark .conformance-dark-only,
.my-dark .conformance-dark-only { display: block }
</style>
