# @poveste/plugin-react

[React](https://react.dev) support for [Poveste](https://poveste.dev): write stories as `.story.tsx` files and browse them in a Poveste book.

Requires Node `>=24.15.0`, `react@^19.0.0` and `react-dom@^19.0.0`, with a JSX transform such as `@vitejs/plugin-react` in your Vite config. See the [React guide](https://poveste.dev/guide/react/getting-started).

This first version renders stories, variants and their source. The controls panel is not wired to React yet: a variant with `initState` gets the generic state editor, and one without says why there is nothing there.
