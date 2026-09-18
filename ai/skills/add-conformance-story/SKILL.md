---
name: add-conformance-story
description: >-
  Add a story that proves a behaviour to the poveste conformance set. The set spans FOUR example
  books (vue, nuxt, svelte, sveltekit) plus a spec in `e2e/` and an entry in `e2e/stories.ts`,
  and `story-list.spec.ts` fails in the three books you forget. Use whenever adding a story that
  demonstrates or proves poveste behaviour, adding an e2e spec that needs a story to drive, or
  fixing a `story-list` failure naming a missing id.
---

# Adding a conformance story

The conformance set is a contract: **the same story, by the same id and title, in all four reference books.** A story added to one book fails `story-list.spec.ts` in the other three, and the failure names a missing id rather than the thing you did.

Before writing anything, open an existing conformance story in each book and copy its shape. `Contrast` and `Button` are small; `Grid state` shows multiple variants.

## The five places

| | |
| --- | --- |
| `examples/vue/src/conformance/` | `.story.vue` |
| `examples/nuxt/app/components/conformance/` | `.story.vue` |
| `examples/svelte/src/conformance/` | `.story.svelte` |
| `examples/sveltekit/src/lib/conformance/` | `.story.svelte` |
| `e2e/stories.ts` | the `{ id, title }` entry all four are held to |

Then the spec itself in `e2e/<name>.spec.ts`.

## Two counts move with it

Two books assert how many stories their sidebar lists, and a story added to the contract moves both:

| | |
| --- | --- |
| `examples/vue/playwright/stories-list.spec.ts` | `toHaveCount(39)` |
| `examples/nuxt/playwright/all-stories.spec.ts` | `toHaveCount(38)` |

They count what the sidebar renders with folders collapsed, not the contract, which is why they are literals rather than derived from `SHARED_STORIES` — the number is a property of that book's tree, and deriving it would assert less than it does.

Bump both in the same change. Miss them and Playwright fails in a book you did not touch, reading `Expected: 39 / Received: 40` (#906).

Fixtures — `quasar`, `vike`, `vue-tailwind`, `vue-percy`, `vue-screenshot`, `vue-themed`, `vue-vuetify` — are **not** in this contract. Adding the story to one only slows it down.

## Ids

Set the id explicitly on the `Story`, matching `e2e/stories.ts` exactly.

Do not let it derive from the path. Each framework lays its files out differently, so a path-derived id is `src-lib-meow-story-svelte` in one book and `src-components-meow-story-vue` in another, and one shared spec cannot address both. The explicit id is the only thing the four books agree on.

The title in `e2e/stories.ts` is asserted too, so a drifted title fails on the title.

## Writing the spec

Use `openStory(page, id)` from `e2e/support.js` rather than `page.goto` — it waits for the book's shell separately from the story, which keeps a genuinely missing story from failing as a timeout (#75).

A spec in `e2e/` runs in every book's conformance project automatically. Nothing needs registering.

Assert on what actually ships. Several defects here looked right in the source and were wrong in the served output, so prefer reading the rendered result over the template that produced it.

## Verifying

Run the suite in more than one book — one framework passing proves nothing about the contract:

```bash
POVESTE_E2E_EXAMPLE=vue npx playwright test -g "<your spec>"
POVESTE_E2E_EXAMPLE=svelte npx playwright test -g "<your spec>"
```

**Kill stray preview servers first.** A server left running from an earlier run is reused and serves stale output, so a fix looks broken or a broken build looks fine. This has cost real debugging time more than once.

Then break your own fix and confirm the spec fails. A conformance spec that passes against the bug is worse than none.
