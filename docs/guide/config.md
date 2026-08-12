# Configuring Poveste

To customize your experience, you can configure several parts of Poveste.

[See the full configuration reference →](../reference/config.md)

## Config file

### Standalone file

The first option is to create a new file at the root of your project called `poveste.config.{js,ts}` or `.poveste.{js,ts}`. The configuration file must export the configuration object as default. Poveste provides a helper function `defineConfig` to enforce TypeScript typing.

Detected files:

- `poveste.config.ts`
- `poveste.config.js`
- `.poveste.ts`
- `.poveste.js`

Example:

```ts
// poveste.config.js
import { defineConfig } from 'poveste'

export default defineConfig({
  // your Poveste configuration
})
```

### Vite config file

The second option is to provide the Poveste config object directly in your Vite config file `vite.config.{js,ts}`. To have the correct TypeScript check, make sure to use this [triple slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) at the very top of your config file:

```ts
/// <reference types="poveste" />
```

Here's what your vite config file should look like:

```ts
// vite.config.js
/// <reference types="poveste" />

import { defineConfig } from 'vite'

export default defineConfig({
  poveste: {
    // your Poveste configuration
  },
})
```

You can use the `process.env.HISTOIRE` environment variable in conditions to modify the vite configuration for Poveste.

## Overriding Vite configuration

Sometimes you need to change some Vite configuration specifically for Poveste. You can do this with the `vite` object inside the Poveste configuration:

```ts
// poveste.config.js
import { defineConfig } from 'poveste'

export default defineConfig({
  vite: {
    // Any Vite configuration
  },
})
```

```ts
// vite.config.js
/// <reference types="poveste" />

import { defineConfig } from 'vite'

export default defineConfig({
  // ...
  poveste: {
    vite: {
      // Any Vite configuration
    },
  },
})
```
::: warning

CommonJS modules must be specified in `vite.optimizeDeps.include` to work in Dev mode.

```ts
// poveste.config.js
import { defineConfig } from 'poveste'

export default defineConfig({
  vite: {
    optimizeDeps: {
      include: ['lodash'],
    },
  },
})
```
:::

### Conditions in Vite config

It might be more convenient to toggle some values in the Vite config using conditions instead, with the `process.env.HISTOIRE` environment variable.

```ts
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: process.env.HISTOIRE ? 6006 : 3000,
  },
})
```

### Ignoring plugins

Some Vite plugins may not work well with Poveste - you can disabled them with the `viteIgnorePlugins` option which is an array for Vite plugin **names**:

```ts
// poveste.config.js
import { defineConfig } from 'poveste'

export default defineConfig({
  viteIgnorePlugins: [
    'vite:html',
    'vite-plugin-some-stuff',
  ],
})
```

You can get the name of the plugins with `console.log(somePlugin().name)` or by looking at its source code ([example](https://github.com/ElMassimo/vite-plugin-full-reload/blob/bfabc4720a04b8c75d4d17f6f4876fdf822cad22/src/index.ts#L43)).

## Global JS and CSS

Your components may be using globally defined CSS (like CSS frameworks) or JS (like stores or helpers). Poveste provides an easy way to inject anything into each story by linking a setup file.

```ts
// poveste.config.ts

export default defineConfig({
  setupFile: '/src/poveste.setup.ts'
})
```

In this file, you can import global CSS files or JS files.

```ts
// src/poveste.setup.ts

import './poveste.css' // Import global CSS
```

You can also tell Poveste to configure the sandbox application using the corresponding setup function (more details afterwards).

| Framework | Setup function | Also accepted |
| --------- | -------------- | ------------- |
| Vue | `setupVue` | `setupVue3` |
| Svelte | `setupSvelte5` | `setupSvelte4`, `setupSvelte3` |

### Vue setup

Inside your setup file, you can export a `setupVue` function that will be called by Poveste allowing you to configure the Vue 3 sandbox application. Poveste provides an optional `defineSetupVue` helper to have better types in your IDE :

```ts
// src/poveste.setup.ts

import { defineSetupVue } from '@poveste/plugin-vue'
import { createPinia } from 'pinia'

export const setupVue = defineSetupVue(({ app, story, variant }) => {
  const pinia = createPinia()
  app.use(pinia) // Add Pinia store
})
```

[Learn more](./vue/app-setup.md)

## Theming

Poveste can be white-labeled to match your brand guidelines. Here are the available options:

```ts
// poveste.config.ts

export default defineConfig({
  theme: {
    title: 'Acme Inc.',
    logo: {
      square: './img/square.png',
      light: './img/light.png',
      dark: './img/dark.png'
    },
    logoHref: 'https://acme.com',
    favicon: './favicon.ico',
  }
})
```

### Colors

To better match your colors guidelines, you can customize every colors used in the app. Note that Poveste uses Tailwind for its UI, so the colors pattern must match the Tailwind pattern.

#### Builtin colors

Poveste provides some builtin patterns to easily change the color of the app.

```ts
// poveste.config.ts

import { defaultColors } from 'poveste'

export default defineConfig({
  theme: {
    colors: {
      gray: defaultColors.zinc,
      primary: defaultColors.cyan
    }
  }
})
```

Available colors patterns:
- `slate`
- `gray`
- `zinc`
- `neutral`
- `stone`
- `red`
- `orange`
- `amber`
- `yellow`
- `lime`
- `green`
- `emerald`
- `teal`
- `cyan`
- `sky`
- `blue`
- `indigo`
- `violet`
- `purple`
- `fuchsia`
- `pink`
- `rose`

#### Custom colors

You can also define your own colors.

```ts
// poveste.config.ts

export default defineConfig({
  theme: {
    colors: {
      gray: {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        750: '#323238',
        800: '#27272a',
        850: '#1f1f21',
        900: '#18181b',
        950: '#101012',
      },
      primary: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63',
      }
    }
  }
})
```
