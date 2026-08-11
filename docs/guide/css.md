# Styles & CSS isolation

By default, Poveste isolates its own UI ("chrome") from the CSS imported via your `poveste.setup.ts`, and keeps your CSS from leaking into chrome. Most of the time you don't need to do anything.

## How it works

Two CSS scopes:

- Your CSS, transitively imported via `poveste.setup.ts` (or directly from a story file), is wrapped in `@scope (.__poveste-render-story)`. It only reaches DOM rendered inside a story container.
- Poveste's own CSS is wrapped in `@scope (.poveste-app-root) to (.__poveste-render-story)`. It only reaches Poveste's chrome and stops at story boundaries.

### Root selectors

`:root`, `html` and `body` all sit above the scoping root once your CSS is wrapped, so a rule targeting them could never match. Poveste rewrites all three to `:scope`, which resolves to `.__poveste-render-story` — inside a story that is the only root there is.

| You write | It runs as |
| --- | --- |
| `:root { --color-primary: blue }` | `:scope { --color-primary: blue }` |
| `html { --brand: rebeccapurple }` | `:scope { --brand: rebeccapurple }` |
| `body { font-size: 14px }` | `:scope { font-size: 14px }` |
| `body .card { … }` | `:scope .card { … }` |
| `body.dark .card { … }` | `:scope.dark .card { … }` |
| `.body-copy { … }` | `.body-copy { … }` — unchanged |

The rewrite reads the selector, not the text, so a class that merely contains the word is left alone.

::: warning A root nested in `:is()` or `:where()` is not rewritten
`:is(html, body) { … }` and `:where(:root) { … }` stay as written, and stay inert. Spell the root selector at the top level of the rule, or target `:scope` yourself.
:::

### Dark mode in your stories

The story preview has its own color scheme, set from the preview appearance dropdown in the toolbar and independent of the app around it. When it is dark, Poveste adds [`theme.darkClass`](/reference/config#theme) to the story root — `dark` unless you change it.

Nothing needs configuring to use this. Write the class you already use:

```css
/* poveste.setup.ts → your CSS */
html.dark {
  background: #27272a;
  color: #e9e9ed;
}
```

That becomes `:scope.dark`, which is the story root, so it paints the story and nothing else.

::: danger Don't target the app's own dark class
Poveste's chrome marks itself dark with a different class, on the document root. That element is outside your scope, so a rule keyed to it never matches — silently. Use `theme.darkClass` and let the story root carry it.
:::

## Grid iframes

Grid items render inside iframes by default. This gives the variant grid the same isolation as the single-variant view, and each iframe sizes to its content.

You can opt out per story:

```vue
<Story :layout="{ type: 'grid', iframeGrid: false }">
  <Variant title="A"><MyComponent /></Variant>
</Story>
```

## Escape hatch — `isolateStyles: false`

If your project depends on chrome and stories sharing the same cascade, disable isolation entirely:

```ts
// poveste.config.ts
export default defineConfig({
  isolateStyles: false,
})
```

This restores pre-isolation behaviour: no scoping, grid items render inline.

## Globally-loaded styles — `globalStyles`

For CSS that should also reach the chrome — design tokens, base typography — use the `globalStyles` config. These files are loaded into the main app, *in addition* to whatever your setup file already loads into stories:

```ts
export default defineConfig({
  globalStyles: ['./src/styles/tokens.css'],
})
```

Files listed in `globalStyles` are wrapped in `@layer poveste-user-globals`, so they cannot accidentally override chrome's appearance — chrome rules are unlayered and win the cascade.

## `?global` per-import escape

To skip wrapping for a single file, append `?global` to the import:

```ts
import './tokens.css?global'
```

The file loads exactly as if you had written it without isolation — at your own risk; it can override chrome.

## Dev vs. build behaviour

Both `poveste dev` and `poveste build` apply `@scope (.__poveste-render-story)` to user CSS, which keeps it from leaking into Poveste's chrome (popovers, tooltips, dropdowns).

`@scope` only matches descendants of the story container, so user styling for components that teleport outside the story (e.g. `floating-vue` popper, modal overlays) does not visually apply in `poveste dev`. The build path emits per-bundle isolation that keeps that styling working inside the sandbox iframe — verify the final visuals with `poveste build`.

Poveste's own sandbox-side defaults are wrapped in `@layer poveste-defaults` so unlayered user CSS overrides them without specificity tricks.

## Browser support

`@scope` is required. Supported in:

- Chrome 118+ (October 2023)
- Safari 17.4+ (March 2024)
- Firefox 128+ (July 2024)

There is no JavaScript fallback. If you need to support older browsers, use the `isolateStyles: false` escape hatch.
