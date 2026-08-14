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

<!--
  Keyed on `my-dark`, this book's `theme.darkClass`. It used to say `.dark`,
  which only worked because the deprecated `sandboxDarkClass` defaulted to
  `dark` and was emitted alongside it (#126).
-->
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
