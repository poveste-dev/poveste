# Writing a control

Six rules, each with the reason it exists. `scripts/checks/control-conventions.ts` fails CI on the two that can be checked mechanically; the other four are here because a reader will meet them before they meet a reviewer.

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

**On a pseudo-element the variant goes before it, not after.** This is the same rule with a second way of failing, and it is the one that had already shipped. `HstSlider` wrote `@apply … dark:bg-gray-700` inside a `::-webkit-slider-thumb` block; the variant is appended to the end of the compound, and nothing may follow a pseudo-element but a user-action pseudo-class:

```css
/* What it compiled to. `:where()` is forgiving, so the browser kept the rule
   and discarded the arguments — leaving a selector that matches nothing. */
.range-input::-webkit-slider-thumb:where()

/* What matches: the variant on the subject, the pseudo-element last. */
.poveste-slider-input:where(.ptw-dark, .ptw-dark *)::-webkit-slider-thumb
```

Six rules across both vendor prefixes sat in the stylesheet, visible in devtools, applying to nothing, and the thumb stayed white on a dark UI for the life of the control. `scripts/checks/control-conventions.ts` fails on a `dark:` inside `@apply` for this reason, and `e2e/dead-selectors.spec.ts` fails on any rule the parser emptied out, whatever produced it.

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

## 6. A control shares the main thread with the story it is editing

A control is not the page. It sits beside a live preview, and every edit crosses a realm boundary into the sandbox, so work a control does on the main thread is work the story being edited does not get.

The budget is not ours to set: a frame is about 16ms and the room in it is roughly 10ms at 60Hz and 5ms at 120Hz, and anything holding the thread for 50ms is a long task by definition. Background work should aim at around half a frame.

Three things follow, in the order they come up here.

**An event that fires at device rate gets one update per frame, not one per event.** `mousemove`, `pointermove`, `wheel`, `scroll` and `input` all fire faster than the screen changes, and a high-polling mouse fires several times per frame. Coalesce with `requestAnimationFrame` — take the latest event, do the work once. `HstNumber`'s drag is the live instance: `onMouseMove` writes the model on every event, and each write crosses the bridge to the sandbox. The shape is the named anti-pattern; the cost here has not been measured, and the rule is written from the shape rather than from a number nobody has taken.

**Animate what the compositor can animate.** `transform` and `opacity` are composited and cost the main thread nothing. Anything that changes size, position or colour — `width`, `border-width`, `background` — is layout or paint on every frame. `poveste-radio-dot` and the checkbox tick are already `transform: scale()`, which is why they are the pattern to copy.

**Do not split what cannot be split.** A single `JSON.parse` or one Reka mount is atomic; chopping it up adds scheduling overhead and moves nothing. Splitting too finely is its own anti-pattern.

Where a control genuinely has heavy work, `scheduler.yield()` is the current way to hand the thread back, with `requestAnimationFrame` as the portable fallback. Neither is in this package yet, and neither should be added before something is measured.

From [The Expensive Main Thread](https://kciter.so/posts/the-expensive-main-thread/en/), which is worth reading once rather than summarising twice.

## Two things deliberately declined

**Tailwind Variants (`tv()`).** It formalises exactly the variant map `HstButton` used to carry, so it is a fair suggestion. Declined on rule 1 rather than on anything measurable: `tv()` is machinery for composing utility strings in `class`, which is the styling this document did not choose. Adopting it would settle the question the other way in a footnote. Nothing about it is unsound — it is a good answer to a question rule 1 already answers.

It also does not reach the thing that made rule 1 worth writing. Reka's states arrive as `data-state`, `data-disabled`, `data-highlighted`; `&[data-state='checked']` is one selector and `data-[state=checked]:` is a variant repeated on every utility that changes. `tv()` organises that repetition, it does not remove it.

An earlier draft declined this on the bundle ceiling instead — so many kilobytes of headroom against so many Reka components. That reason is deliberately gone. The number it rested on has since moved, and a rule whose argument has expired is worse than no rule, because it reads as settled and nothing says the ground went out from under it.

**`reactivePick` + `useForwardProps`.** Reka's own way of forwarding props to a primitive while keeping proxy awareness. Declined because our controls pass primitives an explicit, named set of props rather than arbitrary pass-through, so there is nothing to filter. Worth adopting the first time a control actually forwards, rather than carrying a composable nine controls ignore.

**Cascade layers for control styles** were considered and left alone. Component `<style>` blocks are unlayered today, so they beat every layer including `utilities`; moving them into `@layer components` would change the cascade for every existing control at once. That is a real change with a measurable effect, and it belongs in its own issue rather than riding along with a convention document.
