# Poveste + Vue 3

Requires `vue@^3.5.26`.

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

Coming from histoire? The Vue API is unchanged: swap the dependency and your existing
`.story.vue` files keep working.

[Vue guide](https://poveste.dev/guide/vue/getting-started.html) ·
[Documentation](https://poveste.dev)
