<template>
  <Story
    id="conformance-native-widgets"
    title="Conformance/Native widgets"
  >
    <Variant
      id="default"
      title="default"
    >
      <!-- Painted by the browser, which reads `color-scheme` and no class (#991). -->
      <div class="conformance-native-widgets">
        <input data-widget="range" type="range" aria-label="Range">
        <input data-widget="number" type="number" value="1" aria-label="Number">
        <input data-widget="date" type="date" aria-label="Date">
        <input data-widget="checkbox" type="checkbox" checked aria-label="Checkbox">
        <select data-widget="select" aria-label="Select">
          <option>One</option>
          <option>Two</option>
        </select>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.conformance-native-widgets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
</style>
