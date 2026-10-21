# Poveste + Vue 3

Requires `vue@^3.5.43`.

```bash
pnpm add -D poveste @poveste/plugin-vue
```

Register the plugin in your Poveste config:

```ts
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
})
```

Write stories as `*.story.vue`:

```vue
<script setup>
import MyButton from './MyButton.vue'
</script>

<template>
  <Story title="MyButton">
    <Variant title="default">
      <MyButton />
    </Variant>
  </Story>
</template>
```

`<Story>` and `<Variant>` are registered globally — no import needed.

Each story's **Docs** tab shows a props, slots and events table for the `.vue`
components it imports, read from their types with `vue-component-meta`: descriptions
and tags from JSDoc, defaults from `withDefaults`, slots from `defineSlots` and events
from `defineEmits`. It needs `typescript` 6 or earlier in the project
(`npm i -D typescript@6`); without it, or with 7, it turns itself off and says so once.
Set `autoDocs: false` in the config to turn it off.

Coming from histoire? The Vue API is unchanged: swap the dependency and your existing
`.story.vue` files keep working.

[Vue guide](https://poveste.dev/guide/vue/getting-started) ·
[Documentation](https://poveste.dev)
