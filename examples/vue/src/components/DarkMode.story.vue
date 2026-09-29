<template>
  <Story title="Dark mode">
    <Variant
      title="default"
    >
      <div class="meow">
        <span class="only-dark">Dark</span>
        Meow
      </div>
    </Variant>
  </Story>
</template>

<!-- Keyed on `dark`, this book's `theme.darkClass`, which is the default. It
     reaches the story through that option and not through the deprecated
     `sandboxDarkClass`, whose default made the same selector work once (#126). -->
<style scoped>
.dark .meow {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.only-dark {
  display: none;
}

.dark .only-dark {
  display: inline;
}
</style>
