---
title: 'Controlled stories in Vue — custom controls'
description: 'Build custom controls that update a Vue component, rather than relying on the generated ones.'
---

# Controlled stories

These patterns let you create custom controls to update your component

## Single control

This will display a control panel for the story.

```vue
<script lang="ts" setup>
import { reactive } from 'vue'
import MyComponent from './MyComponent.vue'

const state = reactive({
  text: 'Hello world'
})
</script>

<template>
  <Story title="MyStory">
    <MyComponent :argument="state.text" />
    <template #controls>
      <HstText v-model="state.text" title="Content" />
    </template>
  </Story>
</template>
```

## Global variant control

This will display a control panel for all the variants.

```vue
<script lang="ts" setup>
import { reactive } from 'vue'
import MyComponent from './MyComponent.vue'

const state = reactive({
  text: 'Hello world'
})
</script>

<template>
  <Story title="MyStory">
    <Variant title="MyVariant Red">
      <MyComponent :argument="state.text" color="red" />
    </Variant>
    <Variant title="MyVariant Blue">
      <MyComponent :argument="state.text" color="blue" />
    </Variant>
    <template #controls>
      <HstText v-model="state.text" title="Content" />
    </template>
  </Story>
</template>
```

## Specific variant control

This will display a control panel only for one variant.

```vue
<script lang="ts" setup>
import { reactive } from 'vue'
import MyComponent from './MyComponent.vue'

const state = reactive({
  text: 'Hello world'
})
</script>

<template>
  <Story title="MyStory">
    <Variant title="MyVariant Red">
      <MyComponent :argument="state.text" color="red" />
      <template #controls>
        <HstText v-model="state.text" title="Content" />
      </template>
    </Variant>
    <Variant title="MyVariant Blue">
      <MyComponent argument="hello" color="blue" />
    </Variant>
  </Story>
</template>
```

## Isolated variant control

This will isolate each variant so that you control only one variant at a time.

```vue
<script lang="ts" setup>
import MyComponent from './MyComponent.vue'

function initState() {
  return {
    text: 'Hello world'
  }
}
</script>

<template>
  <Story title="MyStory">
    <Variant
      title="MyVariant Red"
      :init-state="initState"
    >
      <template #default="{ state }">
        <MyComponent :argument="state.text" color="red" />
      </template>
      <template #controls="{ state }">
        <HstText v-model="state.text" title="Content" />
      </template>
    </Variant>
    <Variant
      title="MyVariant Blue"
      :init-state="initState"
    >
      <template #default="{ state }">
        <MyComponent :argument="state.text" color="blue" />
      </template>
      <template #controls="{ state }">
        <HstText v-model="state.text" title="Content" />
      </template>
    </Variant>
  </Story>
</template>
```

## Available controls

`HstText`, `HstTextarea`, `HstNumber`, `HstCheckbox`, `HstCheckboxList`, `HstSelect`, `HstRadio`, `HstButtonGroup`, `HstSlider`, `HstColor`, `HstDate`, `HstJson` and `HstButton`, registered globally in a Vue book, so a story uses them without importing them. `HstColorSelect` is an older colour control that is still exported; `HstColor` is the picker. See [controls](../../guide/vue/controls.md).

`@poveste/controls` exports five more components that are not controls. `HstColorShades`, `HstTokenList` and `HstTokenGrid` draw the design-token pages `@poveste/plugin-tailwind` generates, and `HstCopyIcon` and `HstTooltip` are parts of Poveste's own interface. The first four are registered globally as well, but these pages document only the controls.
