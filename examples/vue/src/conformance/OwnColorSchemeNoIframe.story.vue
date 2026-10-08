<template>
  <Story
    id="conformance-own-color-scheme-no-iframe"
    title="Conformance/Own colour scheme, no iframe"
    :layout="{ type: 'single', iframe: false }"
  >
    <Variant
      id="default"
      title="default"
    >
      <!-- The book pins its own scheme, which the preview setting must not override (#1167). -->
      <div class="conformance-own-color-scheme">
        <input data-widget="checkbox" type="checkbox" checked aria-label="Checkbox">
      </div>
    </Variant>
  </Story>
</template>

<style>
:root:has(.conformance-own-color-scheme) {
  color-scheme: light;
}
</style>
