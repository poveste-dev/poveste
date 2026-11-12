---
title: 'Accessibility checks — run axe-core on a variant'
description: 'The A11y tab checks the variant on show with axe-core, inside the sandbox it renders in, and lists each rule it fails with the elements and a link to the fix.'
---

# Accessibility checks

A story's **A11y** tab, beside Controls, Docs and Events, checks the variant on show with [axe-core](https://github.com/dequelabs/axe-core) and lists what it fails. Each result names the rule, its impact (`critical`, `serious`, `moderate` or `minor`), the elements that fail it, with a selector and their markup, and links to the rule's page, which says how to fix it.

It is part of the book itself, whatever the framework, so there is nothing to install.

## When it runs

In a story with the single layout, the check runs when you open the tab, and again each time the variant's state changes while the tab stays open, a moment after the last change, so typing into a control gives one run rather than one per key. A change to the preview's settings, such as its colour scheme, runs it again too. **Check again** runs it by hand, for a change the story makes without its state, such as a menu it opens itself.

In a grid, the check runs only when you ask, with **Check this variant**. A grid renders a sandbox per variant, and the check is for the variant you have selected.

axe-core is loaded the first time a variant is checked, and only into the sandbox that variant renders in. A book whose readers never open the tab never loads it, and a story's sandbox carries none of its weight until then.

## What it checks

axe-core runs inside the variant's sandbox, the document the variant renders in, so it sees the component as it renders, with its styles, and measures colour contrast against the background the preview shows: the background you picked in the toolbar, or the preview's own surface in its light or dark scheme.

It does not check:

- **A story with `layout: { type: 'single', iframe: false }`.** It renders in the book's own page rather than in a sandbox, so there is no document of its own to check, and the tab says so.
- **The inside of an iframe a component renders.** The check stays in the variant's own document.

A check is a start rather than a verdict. axe-core finds the failures a rule can decide from the page; what it can't decide, such as whether an image's text alternative describes it, or whether the component can be used from the keyboard alone, is still yours to try.

## Rules the sandbox doesn't run

A sandbox renders one component, and some of axe-core's rules ask whether a document is a well-formed page. Asked of the sandbox, they fail for every story, about nothing the story can change. The page your component is placed in is the one that answers them, so the sandbox never runs these:

| Rule | Why it is off |
| --- | --- |
| `landmark-one-main` | A page has one main landmark. A component sits inside the page's, and one of its own would be the defect. |
| `page-has-heading-one` | A page has a level-one heading. The level a component's heading takes depends on where the page puts it. |
| `region` | A page keeps its content inside landmarks. A component rendered alone is outside them by construction; the page it is placed in provides them. |
| `bypass` | A page offers a way past the blocks it repeats, such as a skip link. That belongs to the page's layout, not to a component. |

Every other rule axe-core runs by default stays on, including the ones about the document itself, such as `html-has-lang` and `document-title`: the sandbox Poveste writes passes them, and Poveste's own tests check a plain button in its Vue, Nuxt, Quasar, Svelte and SvelteKit example books and require that nothing is reported. A violation the tab shows comes from the story, or from the book around it, such as a wrapper a setup file adds, not from Poveste.

The tab lists the rules a check skipped, under **rules not run**.

## Turning rules off

To skip a rule in every story, name it in the config's [`a11y.disableRules`](../reference/config.md#a11y):

```ts
import { defineConfig } from 'poveste'

export default defineConfig({
  a11y: {
    disableRules: ['color-contrast'],
  },
})
```

To skip one in a single story, set the story's own `a11y` option, in [Vue](../reference/vue/story.md#a11y) or [Svelte](../reference/svelte/story.md#a11y), or in a Solid or React story's `defineStory`. A story's rules are skipped on top of the book's.

The ids are axe-core's, as the tab shows them; [axe-core's rule list](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) has them all. An id axe-core doesn't have is ignored, and the tab names it so a typo does not pass for a skipped rule.
