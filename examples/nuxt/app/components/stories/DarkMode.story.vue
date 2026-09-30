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

<!-- Keyed on `dark`, the default `theme.darkClass`, which this book does not
     override. It was moved to `my-dark` against a class this book has never
     set, so the rules below matched nothing at all (see #1035). -->
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
