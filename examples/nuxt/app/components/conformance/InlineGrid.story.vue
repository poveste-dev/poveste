<template>
  <Story
    id="conformance-inline-grid"
    title="Conformance/Inline grid"
    :layout="{ type: 'grid', width: 200, iframeGrid: false }"
  >
    <Variant
      id="one"
      title="one"
    >
      <p class="conformance-inline-grid-text">
        One
      </p>
    </Variant>
    <Variant
      id="two"
      title="two"
    >
      <p class="conformance-inline-grid-text">
        Two
      </p>
    </Variant>
  </Story>
</template>

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. Keyed the
     way `darkMode: 'class'` writes it, which did nothing where the app renders
     the story itself (#332). -->
<style scoped>
.dark .conformance-inline-grid-text,
.my-dark .conformance-inline-grid-text {
  color: rgb(0, 255, 0);
  font-weight: 700;
}
</style>
