---
title: 'Story tests in React — every variant as a Vitest test'
description: 'Run each variant of a React story file as a test under your own Vitest, failing on a render error, a rejected initState or anything printed as an error or a warning.'
---

# Story tests

A story file can run as tests under your own Vitest: one test per variant. Each test renders the variant the way the preview does, and fails on what the preview would only show or log: an error thrown in `render`, in an effect or in a setup hook, an `initState` that rejects, or anything printed with `console.error` or `console.warn`, which is where React puts its development warnings, such as a list item without a `key`.

That catches a story a component change has broken, without anyone writing a test for it. The tests check that each variant renders cleanly, not what it renders: your own assertions still go in your own tests.

## Setup

Install Vitest and a DOM for it:

```sh
npm i -D vitest jsdom
```

It needs Vitest 5: `@poveste/plugin-react` declares `vitest` `^5.0.0` as an optional peer.

Add `povesteTesting()` to the Vitest config, next to your own Vite config, which has `@vitejs/plugin-react`:

```ts
// vitest.config.ts
import { povesteTesting } from '@poveste/plugin-react/vitest'
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
// src/Badge.story.test.ts
import { testStories } from '@poveste/plugin-react/testing'
import Badge from './Badge.story'

testStories(Badge)
```

`vitest run` now lists a test for each variant, under the story's title. Both files are in `examples/react`, at `vitest.config.ts` and `src/Badge.story.test.ts`, and CI runs them.

`povesteTesting()` serves your [setup file](./getting-started.md#setup-and-wrappers) and the modules Poveste's client imports. It has Vitest inline Poveste's own packages, which import those modules, through `test.server.deps.inline`. For browser mode, it adds React and React DOM, and the copy of Vue Poveste runs its hosts on, to `optimizeDeps.include`, and your setup file to `optimizeDeps.entries`, so Vite pre-bundles them, and the libraries the setup file imports, before the first test, without reloading partway through it. It adds no alias, so the tests resolve modules exactly as the rest of your Vite config does.

## In a browser

jsdom has no `ResizeObserver`, and its `<canvas>` has no 2D context, so a story that uses either fails there and passes in a browser. Vitest's browser mode runs the same tests in Chromium:

```sh
npm i -D @vitest/browser-playwright
npx playwright install chromium
```

```ts
// vitest.config.ts
import { povesteTesting } from '@poveste/plugin-react/vitest'
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

## Options

`testStories(story, options)` takes:

- `name`: the outer `describe`'s name. The story's `title` by default.
- `timeout`: how long a variant's setup or render may take to settle, in milliseconds. An `initState` still pending then fails the test. 5000 by default.

## What it doesn't do

It doesn't run play functions or interactions: those wait on play functions in stories. Each variant's `initState` runs for that variant's test alone, so one that rejects fails only its own. There's no option yet to accept a known warning or to skip a variant: every variant of the file runs, and anything printed as an error or a warning fails it. To leave a story out, don't give it a test file.
