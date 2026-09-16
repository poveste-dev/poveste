---
title: 'Quasar components in a histoire-style story — why they go missing, and the fix'
description: 'histoire does not support Quasar. Poveste, a fork of histoire, does. Why an app extension or boot file does nothing inside a story, and the setup line that fixes it.'
---

# Using Quasar components in a story

## The symptom

You write a story for a component from your Quasar app and part of it isn't there. Usually it's something an app extension provides, like `<q-calendar-day>` sitting in the page as an unknown element. Or it's a value one of your own boot files sets, which reads `undefined`.

The build is green, no error panel appears, and nothing is logged.

## Why it happens

Boot files run in your app's entry. A story isn't rendered by your app, it's rendered by the story book's own app, so nothing in `src/boot` runs there. Neither does the boot file an app extension adds, which is how the extension registers its components.

So your component isn't broken, and there's nothing to change in `quasar.config.js`. The boot files have to be run in the book as well.

## The fix

Name them in the book's setup file:

```ts
// src/poveste.setup.ts
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'
import greeting from './boot/greeting' // one of your own, from src/boot

export const setupVue = defineSetupVue(setupQuasar({
  boot: [greeting],
}))
```

An app extension's boot file comes from its package rather than your `src/boot`, so import it from there and add it to the same list. For QCalendar that's `@quasar/quasar-app-extension-qcalendar/dist/boot/vite-register.js`.

Two limits worth knowing before you start:

- **Only `app` is passed to a boot file.** A story has no router, no store and no SSR context, so a boot file that needs those has to be split or guarded.
- **SPA mode only.** It's checked against Quasar 2.27 and `@quasar/app-vite` 3.8.

## Where this comes from

histoire does not support Quasar. Poveste is a fork of histoire that does, through `@poveste/plugin-quasar`. Your `<Story>` and `<Variant>` files and your config carry over from histoire unchanged, see [Migrating from histoire](./migration-from-histoire.md).

If you want to check that it's supported and not just claimed: [`examples/quasar`](https://github.com/poveste-dev/poveste/tree/main/examples/quasar) is a real Quasar project that runs the same conformance suite as the Vue, Nuxt, Svelte and SvelteKit books, in CI on every commit. One of its stories renders `NO BOOT FILE RAN` when the setup above is missing, and a test fails on that text, so this exact failure breaks CI instead of going unnoticed.

To set up a book from scratch, start with [Getting started with Quasar](./quasar/getting-started.md).
