# App setup

## Global setup

You can define a setup function globally in your setup file defined by the `setupFile` option
in the global configuration ([learn more](../config.md#global-js-and-css)).

For Svelte it must be called `setupSvelte5`. Poveste provides an optional `defineSetupSvelte`
helper to have better types in your IDE:

```ts
// poveste.setup.ts

import { defineSetupSvelte } from '@poveste/plugin-svelte'

import './poveste.css'

export const setupSvelte5 = defineSetupSvelte(({ app, story, variant }) => {
  // Runs for every mounted story and variant
  document.documentElement.dataset.theme = 'dark'
})
```

::: tip
Importing global CSS or JS files at the top of the setup file — outside the hook — is the
most common use, and it does not need the hook at all. The file is a module like any other.
:::

## Export exactly one name

`setupSvelte5`, `setupSvelte4` and `setupSvelte3` are all accepted. **Every one you export
runs**, in that order, so exporting two names runs your setup twice:

```ts
// Don't: both of these run, one after the other
export function setupSvelte4() { /* … */ }
export function setupSvelte5() { /* … */ }
```

::: warning Different from Vue
Vue's `setupVue` / `setupVue3` pair is *first-wins*: Poveste runs the first name it finds and
warns about the other, so a project migrating between names never applies its setup twice.
Svelte has no such guard — pick one name and export only that.
:::

The numbers are historical. `@poveste/plugin-svelte` supports Svelte 5 only, so `setupSvelte5`
is the name to use; the other two are accepted so histoire-era setup files keep working. The
`defineSetupSvelte` helper is unnumbered, and `defineSetupSvelte3` / `defineSetupSvelte4` /
`defineSetupSvelte5` are aliases of it.

## What the hook receives

| | |
| --- | --- |
| `app` | what Svelte's `mount()` returned — the mounted component instance |
| `story` | the story being rendered |
| `variant` | the variant, or `null` for the story-level mount that fills the controls panel |

Two things follow from `app` being a component instance rather than a Vue-style application
object, and they are the main differences from [the Vue page](../vue/app-setup.md):

- **There is no `app.use()`, `app.component()` or `app.provide()`.** Svelte has no
  application-level plugin API to call.
- **The hook runs after the component is mounted**, not before it. It cannot supply anything
  your component needs while initialising — by the time it runs, the component already has.
  Use it for side effects on the surrounding document, and put anything a component must
  receive at construction into the story itself.

## Local setup

A variant can define a `setupApp` prop, called after the global hook with the same argument:

```svelte
<script>
  export let Hst

  function setupApp({ variant }) {
    document.body.dataset.variant = variant.title
  }
</script>

<Hst.Story title="Story setup">
  <Hst.Variant title="Local setup" {setupApp}>
    <MyComponent />
  </Hst.Variant>
</Hst.Story>
```

::: warning Not inherited by explicit variants
In Vue, a `setup-app` on `<Story>` gives every `<Variant>` a default. In Svelte it does not:
a `setupApp` on `<Hst.Story>` reaches only the implicit variant of a story that declares no
`<Hst.Variant>` children. As soon as you write explicit variants, put `setupApp` on each
variant that needs it.
:::

## SvelteKit

The setup file is configured the same way, under the `poveste` key of your Vite config — see
[SvelteKit](./getting-started.md#sveltekit):

```ts
export default defineConfig({
  plugins: [sveltekit()],
  poveste: {
    plugins: [HstSvelte()],
    setupFile: './src/poveste.setup.ts',
  },
})
```

Poveste mounts your story component directly, so SvelteKit's routing is not involved: no
`+layout.svelte` wraps your story, and no `+page.ts` load runs. Anything a layout would have
provided has to come from the story — wrap the component under test in the story body, the
same as you would for any other provider.

## i18n

There is nothing special to do. A Svelte i18n library — or a hand-rolled `t()` — is an
ordinary module, not a framework plugin, so it has none of the sandbox trouble the [Nuxt
i18n guide](../vue/getting-started.md#i18n) describes: nothing gets booted through an app
entry, so nothing 500s the iframe. Import or initialise it like any other module (in a
`.ts` / `.svelte.ts` file, or in the setup file) and stories pick it up. `examples/svelte5`
carries a minimal version.
