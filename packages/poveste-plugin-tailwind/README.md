# @poveste/plugin-tailwind

Renders a project's Tailwind design system — colours, spacing, typography — as a
story in its book.

```ts
import { HstTailwind } from '@poveste/plugin-tailwind'

export default defineConfig({
  plugins: [
    HstTailwind(),
  ],
})
```

The CSS entrypoint is found automatically: the plugin looks for the usual names
(`src/style.css`, `src/app.css`, `app/assets/css/main.css`, …) and takes the
first that is actually a Tailwind entrypoint — one importing `tailwindcss`, or
declaring `@theme`. Point it somewhere else with `HstTailwind({ cssFile })`.

Tailwind v4 only. The theme is read from CSS custom properties, which is where
v4 keeps it; a v3 project using `@tailwind base` has nothing for this to read.

Adding the plugin also adds a `Design System` group to the story tree.

> This used to be built into `poveste` and enabled by default, which meant a
> project that merely had a file named `src/app.css` got a design-system group
> and a story full of Tailwind's defaults it never asked for. It is opt-in now.
