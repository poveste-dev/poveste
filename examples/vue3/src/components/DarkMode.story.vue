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

<!-- Keyed on `my-dark`, this book's `theme.darkClass`; was `.dark`, which only
     worked via the deprecated `sandboxDarkClass` default (#126). -->
<style scoped>
.my-dark .meow {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.only-dark {
  display: none;
}

.my-dark .only-dark {
  display: inline;
}
</style>
