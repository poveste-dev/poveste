---
title: 'Story tests in Vue — every variant as a Vitest test'
description: 'Run each variant of a Vue story file as a test under your own Vitest, failing on a render error, a rejected initState or a Vue warning.'
---

# Story tests

A story file can run as tests under your own Vitest: one test per variant. Each test renders the variant the way the preview does, and fails on what the preview would only show or log: an error thrown in setup or render, an `initState` that rejects, or a `[Vue warn]`.

That catches a story a component change has broken, without anyone writing a test for it. The tests check that each variant renders cleanly, not what it renders: your own assertions still go in your own tests.

## Setup

Install Vitest and a DOM for it:

```sh
npm i -D vitest jsdom
```

Add `povesteTesting()` to the Vitest config, next to your own Vite config:

```ts
// vitest.config.ts
import { povesteTesting } from '@poveste/plugin-vue'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [povesteTesting()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.story.test.ts'],
  },
}))
```

Then give a story file a test file:

```ts
// src/components/BaseButton.story.test.ts
import { testStories } from '@poveste/plugin-vue/testing'
import BaseButton from './BaseButton.story.vue'

testStories(BaseButton)
```

`vitest run` now lists a test for each variant, under the story's title. Both files are `examples/vue`'s, which CI runs.

`povesteTesting()` serves your [setup file](./app-setup.md) and the modules Poveste's client imports, and compiles a story's `<docs>` block to nothing. It has Vitest inline Poveste's own packages, which import those modules, through `test.server.deps.inline`. It adds no alias and nothing to `optimizeDeps`, so the tests resolve modules exactly as the rest of your Vite config does.

## In a browser

jsdom has no `ResizeObserver`, and its `<canvas>` has no 2D context, so a story that uses either fails there and passes in a browser. Vitest's browser mode runs the same tests in Chromium:

```sh
npm i -D @vitest/browser-playwright
npx playwright install chromium
```

```ts
// vitest.config.ts
import { povesteTesting } from '@poveste/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [povesteTesting()],
  test: {
    include: ['src/**/*.story.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
}))
```

## In Nuxt

Use `@nuxt/test-utils`, whose `nuxt` environment boots your Nuxt app. The stories render inside it, so a story that calls `useRuntimeConfig()` or reads a plugin's injection works as it does in `poveste dev`.

```sh
npm i -D vitest jsdom @nuxt/test-utils
```

```ts
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { povesteTesting } from '@poveste/plugin-vue'

export default defineVitestConfig({
  plugins: [povesteTesting()],
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { domEnvironment: 'jsdom' },
    },
    include: ['test/**/*.story.test.ts'],
  },
})
```

Keep the test files out of `components/`: Nuxt registers every `.ts` file there as a component. `examples/nuxt` keeps them in `test/`.

## Options

`testStories(stories, options)` takes:

- `name`: the outer `describe`'s name. The story file's name by default.
- `timeout`: how long a variant's setup may take to settle, in milliseconds. An `initState` or an async `setup()` still pending then fails the test. 5000 by default.

## What it doesn't do

It doesn't run play functions or interactions: those wait on play functions in stories. It renders the default slot and not the `<docs>` block. And it leaves to the test environment the app a plugin boots for `poveste dev`, which is why a Nuxt book uses `@nuxt/test-utils`.

Story tests are Vue-only for now.
