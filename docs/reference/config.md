---
title: 'Configuration reference — every poveste.config.ts option'
description: 'Every option poveste.config.ts accepts, what it defaults to, and the mistake each one exists to prevent.'
---

<script setup>
const viteNodeInlineDepsError = `.../my-project/node_modules/.pnpm/some-library@1.0.0/lib/esm/index.js:3
export function foo() {
^^^^^^

SyntaxError: Unexpected token 'export'
    at Object.compileFunction (node:vm:352:18)
    at wrapSafe (node:internal/modules/cjs/loader:1031:15)
    ...`
</script>

# Configuration Reference

Learn more about configuring Poveste [here](../guide/config.md).

## `plugins`

Array of plugins. Learn more about [official plugins](../guide/plugins/official.md) and [how to develop them](../guide/plugins/development.md).

```ts
import { HstNuxt } from '@poveste/plugin-nuxt'
import { HstVue } from '@poveste/plugin-vue'

export default defineConfig({
  plugins: [
    HstVue(),
    HstNuxt(),
  ],
})
```

## `outDir`

`string` - Default: `'.poveste/dist'`

Output directory.

```ts
export default defineConfig({
  outDir: '.poveste/dist',
})
```

## `storyMatch`

`string[]` - Default: `['**/*.story.vue', '**/*.story.svelte']`

Glob patterns for story files to include.

```ts
export default defineConfig({
  storyMatch: [
    '**/*.story.vue',
  ],
})
```

Use `src/**/*.story.vue` to prevent search errors in binary files (e.g., in iOS or Android folders) when using Ionic Capacitor.

A framework plugin can add its own patterns to the default: `@poveste/plugin-solid` and `@poveste/plugin-react` each add `**/*.story.tsx` and `**/*.story.jsx`, so a book with Solid or React stories needs no `storyMatch` at all. Setting `storyMatch` yourself replaces the whole list, the patterns plugins added included, which is what lets you narrow it. If you set it in a book with Solid or React stories, list their patterns too. [More than one framework in a book](../guide/plugins/official.md#more-than-one-framework-in-a-book) has the whole rule for a book with two.

## `storyIgnored`

`string[]` - Default: `[ '**/node_modules/**', '**/dist/**' ]`

Glob patterns to ignore files while searching for story files. Patterns you set are added to the defaults, so `node_modules` and `dist` stay ignored without being spelled out again.

```ts
export default defineConfig({
  storyIgnored: [
    '**/fixtures/**',
  ],
})
```

## `supportMatch`

`SupportMatchPattern[]` - Default: `[]`

Which support plugin renders a story, once [`storyMatch`](#storymatch) has decided it is one. The two are separate globs: `storyMatch` is *what is a story*, `supportMatch` is *who renders it*. Each entry is `{ id, patterns, pluginIds }`, where `patterns` are matched against the absolute path.

Plugins contribute the defaults:

| `id` | `patterns` | `pluginIds` | From |
| --- | --- | --- | --- |
| `vue` | `**/*.vue` | `vue3` | `@poveste/plugin-vue` |
| `svelte` | `**/*.svelte` | `svelte4` | `@poveste/plugin-svelte` |
| `solid` | `**/*.story.tsx`, `**/*.story.jsx` | `solid` | `@poveste/plugin-solid` |
| `react` | `**/*.story.tsx`, `**/*.story.jsx` | `react` | `@poveste/plugin-react` |
| `vanilla` | `**/*.js` | `vanilla` | built in |

The Vue, Svelte and built-in entries match on extension rather than on the `.story.` infix. `vue3` and `svelte4` are the ids those two support plugins have always had, and name no version: `svelte4` is what renders Svelte 5. Solid and React claim the same files. When more than one entry matches a file, the plugin the file imports from wins; a file importing both or neither goes to the first entry that matches, with a warning. See [More than one framework in a book](../guide/plugins/official.md#more-than-one-framework-in-a-book).

Entries merge by `id` rather than replacing: reuse an existing `id` and your `patterns` and `pluginIds` are appended to it, so the plugin's own are kept. A new `id` adds a new entry after every entry the plugins contributed. A file it shares with one of theirs goes to the plugin the file imports from, as above, and to theirs when the file imports neither, since theirs comes first. So a new entry reliably claims only files none of theirs match. That is what you want only if you are pointing at a plugin nothing else claims.

A story matching `storyMatch` and no `supportMatch` entry fails collection with `No support plugin found for file …`. That is the reason to set this key: plain TypeScript stories for the built-in renderer, `*.story.ts`, for instance, since its entry claims `**/*.js` alone. A `.story.tsx` file needs no entry, because the Solid and React plugins claim it.

```ts
export default defineConfig({
  // This replaces the default list: add '**/*.story.vue' and the rest back if
  // the book has those stories too.
  storyMatch: ['**/*.story.ts'],
  supportMatch: [
    // Same `id` as the built-in entry, so this extends it rather than
    // competing with it.
    { id: 'vanilla', patterns: ['**/*.ts'], pluginIds: ['vanilla'] },
  ],
})
```

## `tree`

`Object` - Default: `{ file: 'title', order: 'asc' }`

How to generate the story tree.

Learn more: [Vue 3](../guide/vue/hierarchy.md)

Properties:

- `file: 'title' | 'path' | ((file: TreeFile) => string[])`: How to get the path of a story.
- `order: 'asc' | ((a: string, b: string) => number)`: How to sort the stories.

```ts
export default defineConfig({
  tree: {
    file: 'title',
    order: 'asc',
  },
})
```

## `theme`

`Object`

Customize the look of the book.

[Learn more](../guide/config.md#theming)

Properties:

- `title: string`: Main page title. For example: 'Acme Inc.'
- `logo: Object`: Logo configuration.
  - `square: string`: Square logo image without text.
  - `light: string`: Full logo for light theme.
  - `dark: string`: Full logo for dark theme.
- `favicon: string`: Href to the favicon file (**not** processed by Vite). Put the file in the `public` directory.
- `colors: Object`: Customize the colors. Each color should be an object with shades as keys.
- `logoHref: string`: Add a link to the main logo
- `darkClass: string`: Class added to the story preview when dark mode is enabled (default is `'dark'`). The story preview has its own color scheme, picked from the preview appearance dropdown in the toolbar (System / Light / Dark) and independent from the color scheme of the app around it.
- `defaultColorScheme: 'light' | 'dark' | 'auto'`: Default color scheme for the app and for the story preview. `'auto'` will use the system preference.
- `hideColorSchemeSwitch: boolean`: Hides the dark mode button in the toolbar, and the color scheme buttons in the preview appearance dropdown — the story preview then stays on `defaultColorScheme`.
- `storeColorScheme: boolean`: Enable persistence of the color scheme in the browser's local storage.

```ts
import { defaultColors } from 'poveste'

export default defineConfig({
  theme: {
    title: 'Acme Design System',
    favicon: '/my-favicon.svg',
    logo: {
      square: '/src/img/logo-square.svg',
      light: '/src/img/logo-light.svg',
      dark: '/src/img/logo-dark.svg',
    },
    colors: {
      primary: defaultColors.cyan,
    },
    logoHref: 'https://acme.com',
    defaultColorScheme: 'light',
    hideColorSchemeSwitch: true,
    storeColorScheme: false,
  },
})
```

## `setupFile`

`string | { browser: string, server: string }`

A file of your own that Poveste loads with every story, in Poveste's interface and in each preview. Import global CSS from it, and export the setup function your framework's plugin reads — `setupVue`, `setupSvelte`, `setupSolid` or `setupReact` — to run code before each story mounts.

A default export is not called. The file is still loaded, so what it imports applies, but the function never runs and nothing warns.

The path is resolved from the project root. The leading slash means that root, not the filesystem's, and `'src/poveste.setup.ts'` without it names the same file.

[Learn more](../guide/config.md#global-js-and-css)

```ts
export default defineConfig({
  setupFile: '/src/poveste.setup.ts',
})
```

If you need a different version for the NodeJS server (while collecting stories), you can use an object:

```ts
export default defineConfig({
  setupFile: {
    browser: '/src/poveste.setup.ts',
    server: '/src/poveste.setup.server.ts',
  },
})
```

This can be useful if you need to exclude some imported libraries that only works in the browser.

## `isolateStyles`

`boolean` - Default: `true`

Master switch for CSS isolation between Poveste's chrome and your stories. When enabled, your CSS imported via `setupFile` is scoped to story containers, chrome CSS is scoped away from them, and grid items render in iframes.

See [the Styles & CSS guide](../guide/css.md) for details.

```ts
export default defineConfig({
  isolateStyles: false, // restore pre-isolation behaviour
})
```

## `autoDocs`

`boolean | { allow?: string[], exclude?: string[] }` - Default: `true`

For Vue, Svelte, Solid and React books, for now: a props, slots and events table on a story's **Docs** tab, read from the component's types: Vue's through `vue-component-meta`, Svelte's from the type on `$props()`, for each component a Vue or Svelte story imports, directly or through re-exports, or names in its [`component`](./vue/story.md#component). A Solid or React story names its component in its `component` field instead, since JSX stories import much besides it, and its props are read from the type of the component's first parameter. In `poveste dev`, nothing runs until a reader first opens a story's docs: extraction then starts in a worker, after stories are collected, and only for the components that story names. Until it answers, the Docs tab says it is reading component types; the first time can take many seconds. `poveste build` has no reader to wait for, so it reads every story's components in one pass after collection, and the book carries the tables it read. That pass adds to the build's time: about 2 seconds on the Vue example book's 74 stories.

A type that names one, such as `ButtonSize`, opens on hover or keyboard focus to what it stands for, `"sm" | "md" | "lg"`: an alias's definition, an interface's members, an enum's members, and each of those inside a union. It opens one level, so a recursive type stops there, and it is cut at 24 members and 400 characters. A type declared only in an installed package, such as `ReactNode`, stays closed.

It needs TypeScript in the book, version 6 or earlier: `npm i -D typescript@6`. Every framework reads the types through TypeScript's own API, which TypeScript 7 no longer has. In a book without TypeScript, or with TypeScript 7, auto-docs turns itself off and says so once in the log, and in `poveste dev` on the Docs tab, in the same words; a built book's Docs tab shows no table, and props detected at runtime show as before. A Svelte book also needs `svelte2tsx`, an optional peer of `@poveste/plugin-svelte`, and a React book needs `@types/react`, since React ships no types of its own; without it, auto-docs for that framework turns off the same way.

In a built book, a component whose types could not be read is left out of the docs, and the build log says how many were.

It holds a type checker while it runs, which on a large component library costs up to about 1 GB. A build reads every component, so it pays the whole of that; `poveste dev` pays for the components whose docs have been opened. Set it to `false` to turn it off; props detected at runtime still show.

```ts
export default defineConfig({
  autoDocs: false,
})
```

Props declared in installed packages are left out, which drops the HTML attributes a component inherits. `allow` keeps the props your own components take from the packages it names, such as a design system whose prop types they extend. In a Vue or Svelte book it does not add a table for a library's components: importing one from a package reaches the package's JavaScript entry, not a `.vue` or `.svelte` file, and gets none. A Solid or React story that names a library's component in `component` does get a table, read from the package's types, and since every one of its props is declared in that package, `allow` naming it is what fills the table: without it the table is the component's name and no rows. `exclude` leaves out components whose path contains one of its strings.

```ts
export default defineConfig({
  autoDocs: {
    allow: ['reka-ui'],
    exclude: ['src/internal/'],
  },
})
```

A story can choose its own table with its `autoDocs` option: `false` for none, or a list of the sections to show, such as `['props', 'events']`. See the [Vue](./vue/story.md#autodocs) and [Svelte](./svelte/story.md#autodocs) story references; a Solid or React story sets the same field in `defineStory`. A story can't turn auto-docs on in a book that has it off. It isn't a way to save memory: a list still reads the whole component, and `false` skips only that story's components, so once another story's docs are opened the checker is held anyway. To avoid that cost, set `autoDocs: false` here.

## `globalStyles`

`string[]` - Default: `[]`

CSS files to load into the main app (not into stories). They are wrapped in `@layer poveste-user-globals`, which keeps them lower priority than chrome rules. Use for design tokens or anything you want to apply across both chrome and stories.

```ts
export default defineConfig({
  globalStyles: ['./src/styles/tokens.css'],
})
```

## `defaultStoryProps`

`Object`

Default values for story props.

```ts
export default defineConfig({
  defaultStoryProps: {
    icon: 'carbon:assembly-reference',
    iconColor: '#00c5a5',
    layout: {
      type: 'grid',
      width: 300,
    },
    responsiveDisabled: true,
    autoPropsDisabled: true,
  },
})
```

`autoPropsDisabled` applies to Vue and Svelte stories. Automatic prop detection does not run for vanilla stories, so setting it here changes nothing for them.

## `setupCode`

`string[]` - Default: none

Setup modules injected into the story sandbox as source, for plugins that have to generate code rather than point at a file. `@poveste/plugin-nuxt` uses it to import the app's CSS and call `setupNuxtApp` with the resolved runtime config, neither of which exists as a file a book could name.

**Set by plugins, not by books.** Use [`setupFile`](#setupfile) instead — it takes a path, runs in both the app and the sandbox, and is the supported surface. Entries are concatenated rather than replaced, so a book assigning this does not remove what a plugin added.

## `sandboxDarkClass`

`string` - Default: none - **Deprecated**

Class added to the story preview's html root in dark mode. Superseded by [`theme.darkClass`](#theme), which applies to every render path — inline, iframe and grid — rather than only the sandbox.

Still honoured where it is set, and emitted alongside `theme.darkClass` rather than instead of it, so a book that set both gets both classes. A book setting only `theme.darkClass` gets that one class everywhere ([#126](https://github.com/poveste-dev/poveste/issues/126)). Nothing needs doing on upgrade unless you set this key; if you did, move the value to `theme.darkClass` and delete it.

## `responsivePresets`

`Array`

Predefined responsive sizes for story playgrounds.

Each object in the array is a preset with the following properties:

- `label: string`: Label for the preset.
- `width: number`: Width of the preset (pixels).
- `height: number | null`: Height of the preset (pixels). `null` sizes the preview to the available space, which is what four of the defaults below do.

Default values are shown in the example below:

```ts
export default defineConfig({
  responsivePresets: [
    {
      label: 'Mobile (Small)',
      width: 320,
      height: 560,
    },
    {
      label: 'Mobile (Medium)',
      width: 360,
      height: 640,
    },
    {
      label: 'Mobile (Large)',
      width: 414,
      height: 896,
    },
    {
      label: 'Tablet',
      width: 768,
      height: 1024,
    },
    {
      label: 'Laptop (Small)',
      width: 1024,
      height: null,
    },
    {
      label: 'Laptop (Large)',
      width: 1366,
      height: null,
    },
    {
      label: 'Desktop',
      width: 1920,
      height: null,
    },
    {
      label: '4K',
      width: 3840,
      height: null,
    },
  ],
})
```

## `backgroundPresets`

`Array`

Background color of the story preview.

Each object in the array is a preset with the following properties:

- `label: string`: Label for the preset.
- `color: string`: Color of the preset.
- `contrastColor?: string`: Contrast color of preset

Default values are shown in the example below:

```ts
export default defineConfig({
  backgroundPresets: [
    {
      label: 'Transparent',
      color: 'transparent',
      contrastColor: '#333'
    },
    {
      label: 'White',
      color: '#fff',
      contrastColor: '#333'
    },
    {
      label: 'Light gray',
      color: '#aaa',
      contrastColor: '#eee'
    },
    {
      label: 'Dark gray',
      color: '#333',
      contrastColor: '#ccc'
    },
    {
      label: 'Black',
      color: '#000',
      contrastColor: '#fff'
    },
  ],
})
```

You can use the current contrast color via the css variable `--poveste-contrast-color`. The histoire-era `--histoire-contrast-color` is still set as a deprecated alias:

```css
.my-class {
  color: var(--poveste-contrast-color);
}
```

## `preview`

`object`

What the story preview opens at, before the reader changes it in the toolbar. Each field mirrors the toolbar setting of the same name, and each is optional.

```ts
export default defineConfig({
  preview: {
    backgroundColor: '#fff',
    responsiveWidth: 360,
    responsiveHeight: 640,
  },
})
```

- `backgroundColor: string` - Default: `'transparent'`. Any CSS color. Match a `color` from [`backgroundPresets`](#backgroundpresets) to also highlight that entry in the dropdown.
- `responsiveWidth: number | null` - Default: `720`. In pixels; `null` sizes the preview to the available space. The default matches none of the default [`responsivePresets`](#responsivepresets): set this and `responsiveHeight` to one of them to open at it.
- `responsiveHeight: number | null` - Default: `null`.
- `rotate: boolean` - Default: `false`. Swaps the width and height.
- `checkerboard: boolean` - Default: `false`. Shows a checkerboard behind the story.
- `textDirection: 'ltr' | 'rtl'` - Default: `'ltr'`.

Each value is applied on every load, including for readers with previously stored settings and when you change it, until the reader changes that setting in the toolbar. From then on their choice wins for that setting and the others keep following your config. The width and height count as one setting, since a preset or a drag changes both.

The preview's color scheme is configured under [`theme.defaultColorScheme`](#theme), not here.

## `defaultBackgroundColor`

`string` - **Deprecated**: use [`preview.backgroundColor`](#preview)

Still honoured where it is set. When `preview.backgroundColor` is set too, that one wins. Nothing needs doing on upgrade unless you set this key; if you did, move the value to `preview.backgroundColor` and delete it.

## `autoApplyContrastColor`

`boolean` - Default: `false`

Automatically apply the contrast color to the story preview text.

```ts
export default defineConfig({
  autoApplyContrastColor: true,
})
```

## `head`

`UseHeadInput` - Default: `undefined`

Extra `<head>` tags injected into the Poveste app **and** the story sandbox iframe. Same input shape as Nuxt's [`useHead`](https://unhead.unjs.io/), rendered at build time. Use for global stylesheets, web fonts, analytics snippets, or any meta tag that needs to apply in both contexts.

```ts
export default defineConfig({
  head: {
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins&display=swap' },
    ],
    meta: [
      { name: 'theme-color', content: '#10b981' },
    ],
  },
})
```

The app's page gets a description of its own unless `head` sets one: "*`theme.title`*, a book of component stories." A `{ name: 'description', content: '…' }` entry in `meta` replaces it.

## `markdown`

`(md: MarkdownIt) => MarkdownIt | Promise<MarkdownIt>`

Customize the [markdown-it](https://github.com/markdown-it/markdown-it) renderer.

The renderer is markdown-it 15, so a plugin passed to `md.use` has to support it: one that calls `md.utils.assign` or imports `markdown-it/lib/*` throws. Its types ship with `markdown-it` itself, so `@types/markdown-it` is not needed.

```ts
export default defineConfig({
  markdown: (md) => {
    md.use(SomeMarkdownItPlugin)
  },
})
```

## `routerMode`

`'history' | 'hash'` - Default: `'history'`

Changes the router mode:
- `'history'`: HTML 5 history mode with cleaner URLs.
- `'hash'`: Use the hashtag hack in the URL to support more servers and static hosting services.

```ts
export default defineConfig({
  routerMode: 'hash',
})
```

## `vite`

`ViteConfig | ((config: ViteConfig, env: ViteConfigEnv) => void | ViteConfig | Promise<void | ViteConfig>)`

[Vite config](https://vitejs.dev/config/) override.

```ts
export default defineConfig({
  vite: {
    server: {
      port: 3042,
    },
  },
})
```

## `viteIgnorePlugins`

`string[]`

List of Vite plugin names to exclude for Poveste.

```ts
export default defineConfig({
  viteIgnorePlugins: [
    'vite-plugin-example',
  ],
})
```

`@poveste/plugin-svelte` already lists SvelteKit's plugins here, so a SvelteKit book needs nothing of its own.

## `viteNodeTransformMode`

`{ web?, ssr? }`

Determine the transform method of modules

### `viteNodeTransformMode.ssr`

`RegExp[]` - Default: `[/\.([cm]?[jt]sx?|json)$/]`

Use SSR transform pipeline for the specified files.<br>
Vite plugins will receive `ssr: true` flag when processing those files.

### `viteNodeTransformMode.web`

`RegExp[]` - Default: *modules other than those specified in `transformMode.ssr`*

First do a normal transform pipeline (targeting browser), then do a SSR rewrite to run the code in Node.<br>
Vite plugins will receive `ssr: false` flag when processing those files.

When you use JSX as component models other than React (e.g. Vue JSX or SolidJS), you might want to config as following to make `.tsx` / `.jsx` transformed as client-side components:

```ts
export default defineConfig({
  viteNodeTransformMode: {
    web: [/\.[jt]sx$/],
  },
})
```

## `viteNodeInlineDeps`

`RegExp[]`

Transpile dependencies when collecting stories on Node.js.

For example, if you have a dependency that contains ESM code but Node tries to load it in CommonJS context, you might have this kind of error:

<div class="overflow-auto bg-gray-100 rounded dark:bg-gray-850 text-sm">
  <pre class="text-red-500 p-4 w-fit m-0">{{ viteNodeInlineDepsError }}</pre>
</div>

We can see that the `some-library` (made-up name) is misconfigured and Node treats it as CommonJS code (the `cjs/loader` is being used) but it contains ESM code. Hence the error.

```ts
export default defineConfig({
  viteNodeInlineDeps: [
    /some-library/,
  ],
})
```

## `collectMaxThreads`

`number` - Default: available cpus

Number of maximum threads used to collect stories (both for development and building). Threads count will never go above this limit but might be lower.

```ts
export default defineConfig({
  collectMaxThreads: 4,
})
```

## `build`

`Object`

Build-time options, applying to `poveste build` only.

### `build.excludeFromVendorsChunk`

`(string | RegExp)[]` - Default: `[]`

Dependencies to keep out of the single `vendors` chunk that everything in `node_modules` is bundled into by default. Use it for a dependency large enough that loading it with the first story costs more than fetching it separately.

```ts
export default defineConfig({
  build: {
    excludeFromVendorsChunk: ['lottie-web', /^@my-org\//],
  },
})
```
