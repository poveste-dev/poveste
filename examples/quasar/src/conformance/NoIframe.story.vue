<template>
  <Story
    id="conformance-no-iframe"
    title="Conformance/No iframe"
    :layout="{ type: 'single', iframe: false }"
  >
    <Variant
      id="default"
      title="default"
    >
      <p class="conformance-inline">
        Rendered without an iframe
      </p>
      <p class="conformance-no-iframe-dark">
        Styled by the book's own dark rule
      </p>
    </Variant>
  </Story>
</template>

<!-- Both class names: the dark class is per-book config (`theme.darkClass`),
     and a contract story has to hold whichever one its example sets. Keyed the
     way `darkMode: 'class'` writes it, which did nothing where the app renders
     the story itself (#332). -->
<style scoped>
.conformance-inline {
  color: var(--poveste-contrast-color);
}

.dark .conformance-no-iframe-dark,
.my-dark .conformance-no-iframe-dark {
  color: rgb(0, 255, 0);
  font-weight: 700;
}
</style>
