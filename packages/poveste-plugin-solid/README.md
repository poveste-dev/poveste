# @poveste/plugin-solid

[SolidJS](https://www.solidjs.com) support for [Poveste](https://poveste.dev): write stories as `.story.tsx` files and browse them in a Poveste book.

Requires Node `>=22.22.2`, `solid-js@^1.9.0` and `vite-plugin-solid@^2.11.0`. See the [Solid guide](https://poveste.dev/guide/solid/getting-started).

It renders stories and variants. The source panel shows the story file, or a variant's own `source` where one is set. A story that names its component in its `component` field gets a props, slots and events table on its Docs tab, read from the component's types; it reads them with a TypeScript 6 this plugin installs, whatever TypeScript the book has. See [Component docs](https://poveste.dev/guide/solid/getting-started#component-docs). The controls panel is not wired to Solid: a variant with `initState` gets the generic state editor, and one without says why there is nothing there.
