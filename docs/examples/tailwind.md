# Tailwind CSS example

In this example, we will see how to add Tailwind CSS to the stories.

## CSS file

Make sure your project has a style file with the [Tailwind directives](https://tailwindcss.com/docs/functions-and-directives#tailwind).

```css
/* src/tailwind.css */

@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Setup file

Poveste allows us to execute a setup file automatically when rendering the stories. This is useful to add global CSS files. [Learn more](../guide/config.md#global-js-and-css)

```js
// src/poveste-setup.ts

import './tailwind.css'
```

We need to tell Poveste to use this file in the configuration file. [Learn more](../reference/config.md#setupfile)

```js
// poveste.config.ts

import { defineConfig } from 'poveste'

export default defineConfig({
  setupFile: '/src/poveste-setup.ts',
})
```

You can now use Tailwind utility classes in your stories (or import components using them)!

## Design system story

Poveste can render your Tailwind theme — colours, spacing, typography — as a
story, with [@poveste/plugin-tailwind](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-tailwind):

```js
import { HstTailwind } from '@poveste/plugin-tailwind'

export default defineConfig({
  plugins: [
    HstTailwind(),
  ],
})
```

It finds the CSS entrypoint itself, taking the first of the usual names
(`src/style.css`, `src/app.css`, `app/assets/css/main.css`, …) that actually
imports `tailwindcss` or declares `@theme`. Pass `cssFile` to point it elsewhere.

Tailwind v4 only: the theme is read from CSS custom properties, which is where
v4 keeps it.

::: tip
This was built into poveste and on by default before 0.5.4. It is opt-in now —
add the plugin to keep the story.
:::
