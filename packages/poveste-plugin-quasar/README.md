# @poveste/plugin-quasar

Builds a Poveste book inside a Quasar project.

```ts
import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'

export default defineConfig({
  plugins: [
    HstVue(),
    HstQuasar(),
  ],
})
```

Quasar builds its Vite config asynchronously and exposes it through an
entrypoint whose own header says it is for tooling. This plugin fetches it and
makes the two adjustments a book needs — both of which are easy to get wrong and
fail in ways that do not point back at them.

Quasar's plugins are passed through whole. Nothing needs removing, which is
unusual: `@poveste/plugin-nuxt` drops six. Removing Quasar's Vue plugin as a
duplicate is the tempting mistake, and `@quasar/vite-plugin` refuses outright
because it asserts a Vue plugin is registered before it.

Quasar is also kept transformed rather than externalised during story
collection. Its plugin writes `__QUASAR_VERSION__` while transforming its own
source, so a source loaded through Node instead has nothing to read.

## Boot files

Poveste renders your components in its own app, so Quasar's boot files never run
on their own — and an app extension registers its components through a boot file
it contributes, so an extension's components are missing too. Both fail quietly:
the build succeeds and the component is simply absent.

Pass them to `setupQuasar` in your setup file:

```ts
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue3 } from '@poveste/plugin-vue'
import greeting from './boot/greeting'

export const setupVue3 = defineSetupVue3(setupQuasar({
  boot: [greeting],
}))
```

Only `app` is passed to a boot file: a story has no router, no store and no SSR
context, so one that needs those has to be split or guarded.

Needs `@quasar/app-vite@^3.8.0` and `quasar@^2.24.0`. Quasar's SPA config is what
the entrypoint returns, so that is what a book is built with.

[Configuration](https://poveste.dev/reference/config.html) ·
[Quasar recipe](https://poveste.dev/guide/config.html)
