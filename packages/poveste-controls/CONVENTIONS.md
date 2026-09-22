# Writing a control

Five rules, each with the reason it exists. `scripts/checks/control-conventions.ts` fails CI on the two that can be checked mechanically; the other three are here because a reader will meet them before they meet a reviewer.

Settled in #978, before #955 wrote ten more controls against whichever convention happened to be copied. Two existed at the time and disagreed.

## 1. Style in a `<style>` block, not in the class attribute

A control's styling is plain CSS with semantic class names, in the component's own `<style lang="postcss">` block. Not Tailwind utilities in `class`, and not a map of utility strings in script.

Both read the same tokens, so this is not about correctness. It is about a variant being one block a reader can see at once, and about Reka's states arriving as attributes — `&[data-state='checked']` is a CSS selector and `data-[state=checked]:` is a variant repeated on every utility that changes.

`HstCheckbox` is the example to copy.

## 2. Colours come from the tokens, never from a literal

`src/style/tokens.css` bridges every themable colour to `--_poveste-color-<name>-<key>`, which each book supplies from `theme.colors`. Write `var(--color-primary-500)`, never `#10b981`.

`scripts/checks/theme-tokens.ts` already holds the bridge in both directions. This rule is about the other end: a literal in a control is a colour no book can theme, and nothing reports it.

A literal is fine where no token exists and none should — a tooltip's translucent black is not a brand colour. `--color-white` and `--color-black` are Tailwind's own and are tokens too.

## 3. Dark mode goes on the subject, not on an ancestor

```css
&:where(.ptw-dark, .ptw-dark *) {
  border-color: rgb(255 255 255 / .25);
}
```

`.ptw-dark` sits on `<html>`, above the `@scope` root the chrome is wrapped in, so a descendant rule keyed on it never matches from inside a control (#101).

The `dark:` **utility** is safe — `@custom-variant dark (&:where(.ptw-dark, .ptw-dark *))` in `main.css` compiles it to exactly the form above. `@apply` with a `dark:` variant inside a component `<style>` is what fails, and it fails silently: the control keeps its light colours on a dark UI and nothing says so.

## 4. Every part a consumer might target carries `data-slot`

```vue
<button class="poveste-button" data-slot="button">
```

A control renders inside a consumer's book, where `@scope` removes their CSS from it. A stable attribute is the only seam they have. The alternative is consumers depending on our class names, which is a contract nobody agreed to and which this package renames freely.

The names are parts, not elements: `control`, `box`, `option`, `visual`. One per element a consumer could reasonably want to reach.

## 5. Props resolve in one order, and it is this one

Highest wins:

```
variant prop  →  story attr  →  story property  →  poveste.config defaultStoryProps
```

`inheritedFromStory` in `plugin-vue/src/client/app/Story.ts` fills only where the variant left a prop `undefined`; `collect/index.ts` applies `defaultStoryProps` only where the collected value is `null` or `undefined`.

Written down because it was not, anywhere, and ten controls each resolving it by feel is how two of them end up disagreeing.

## Two things deliberately declined

**Tailwind Variants (`tv()`).** It formalises exactly the variant map `HstButton` used to carry, so it is a fair suggestion. Declined on the bundle ceiling: `vendor` has about 8 KB of headroom against 1450, and #955 needs ten Reka components inside it. A dependency that buys syntax for something `&[data-color='primary']` already expresses is not what that headroom is for.

**`reactivePick` + `useForwardProps`.** Reka's own way of forwarding props to a primitive while keeping proxy awareness. Declined because our controls pass primitives an explicit, named set of props rather than arbitrary pass-through, so there is nothing to filter. Worth adopting the first time a control actually forwards, rather than carrying a composable nine controls ignore.

**Cascade layers for control styles** were considered and left alone. Component `<style>` blocks are unlayered today, so they beat every layer including `utilities`; moving them into `@layer components` would change the cascade for every existing control at once. That is a real change with a measurable effect, and it belongs in its own issue rather than riding along with a convention document.
