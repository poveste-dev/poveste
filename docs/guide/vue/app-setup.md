# App setup

## Global setup

You can define a setup function globally in your setup file defined by the `setupFile` option in the global configuration ([learn more](../config.md#global-js-and-css)).

For Vue, it must be called `setupVue`. Poveste provides an optional `defineSetupVue` helper to have better types in your IDE:

```ts
import { defineSetupVue } from '@poveste/plugin-vue'
import { createPinia } from 'pinia'

export const setupVue = defineSetupVue(({ app, story, variant }) => {
  // Vue plugin
  app.use(createPinia())

  // Global component
  app.component('GlobalComponent', MyGlobalComponent)

  // Global property
  app.config.globalProperties.$t = key => translate(key)

  // Provide
  app.provide('key', 'meow')
})
```

::: tip
You can also import global CSS files or JS files in this setup file.
:::

::: info Coming from `setupVue3`?
`setupVue3` and `defineSetupVue3` still work — nothing needs changing today. They are the
original histoire-era names, kept because renaming an export people write in their own files
cannot be done without breaking every existing setup.

Export **one** of the two, not both: they are aliases for the same hook, so Poveste runs the
first it finds (`setupVue3`) and warns about the other rather than running your setup twice.

The numbered pair is supported for the whole of 0.x. 1.0 is the only release allowed to drop
it, so moving across before then costs nothing and saves a migration later.
:::

## Local setup

Inside each story, you can define a `setupApp` prop that will be called by Poveste allowing you to configure the sandbox application as well. It will **not** override the global setup function, but will be called after it. It works the same way with the same parameters.

```vue{17}
<script setup>
import InjectDemo from './InjectDemo.vue'

function mySetupApp ({ app, story, variant }) {
  app.provide('demo', 'meow')
}
</script>

<template>
  <Story title="Story setup">
    <Variant title="Global setup">
      <InjectDemo />
    </Variant>

    <Variant
      title="Local setup"
      :setup-app="mySetupApp"
    >
      <InjectDemo />
    </Variant>
  </Story>
</template>
```

You can put the prop on the `<Story>` component too, so that `<Variant>` will have a default value for it. Redefining the prop on a `<Variant>` will **override** the function though.

## Examples

### Vue Router

```vue{5-11,18}
<script setup>
import { createRouter, createMemoryHistory } from 'vue-router'

function setupApp ({ app, story, variant }) {
  // Router mock
  app.use(createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { render: () => null } },
    ],
  }))
}
</script>

<template>
  <Story
    title="Vue router example"
    :setup-app="setupApp"
  >
    <pre>{{ $route }}</pre>
  </Story>
</template>
```

### Pinia

In global setup file:

```ts{6}
import { createPinia } from 'pinia'
import { defineSetupVue } from '@poveste/plugin-vue'

export const setupVue = defineSetupVue(({ app, story, variant }) => {
  // Vue plugin
  app.use(createPinia())
})
```

In component:

```vue
<script setup>
import { useItemStore } from '../stores/item.js'

const itemStore = useItemStore()
</script>

<template>
  <pre>{{ itemStore.items }}</pre>
</template>
```

In story file:

```vue
<script setup>
import MyItems from './MyItems.vue'
</script>

<template>
  <Story
    title="Pinia example"
  >
    <MyItems />
  </Story>
</template>
```

### Vuex

```vue{5-10,17}
<script setup>
import { createStore } from 'vuex'

function setupApp ({ app, story, variant }) {
  // Store mock
  app.use(createStore({
    state: () => ({
      hello: 'meow',
    }),
  }))
}
</script>

<template>
  <Story
    title="Vuex example"
    :setup-app="setupApp"
  >
    <pre>{{ $store.state }}</pre>
  </Story>
</template>
```

### i18n (vue-i18n)

Install [vue-i18n](https://vue-i18n.intlify.dev) on the story app in your setup file, the same
as any other plugin:

```ts
import { defineSetupVue } from '@poveste/plugin-vue'
import { createI18n } from 'vue-i18n'

export const setupVue = defineSetupVue(({ app }) => {
  app.use(createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    messages: {
      en: { greeting: 'Hello' },
      fr: { greeting: 'Bonjour' },
    },
  }))
})
```

Declare vue-i18n's compile-time flags, the same as any plain Vite app — see
`examples/vue3`:

```ts
export default defineConfig({
  // vue-i18n reads these compile-time flags; a plain Vite app has to define them.
  define: {
    __VUE_I18N_FULL_INSTALL__: 'true',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
  },
})
```

Story collection applies this `define` too, so nothing extra is needed to reach
vue-i18n through it. Earlier versions also required
`viteNodeInlineDeps: [/vue-i18n/, /@intlify/]` because collection externalises node
modules and `define` never reached them; that is fixed (#284) and the entry can go.
Vue's own flags — `__VUE_PROD_DEVTOOLS__` and friends — come from `@vitejs/plugin-vue`
and never needed declaring.

Nuxt users need none of this: `@nuxtjs/i18n` provides the flags, and its own client
plugin is handled for you — see the [Nuxt i18n guide](./getting-started.md#i18n).
