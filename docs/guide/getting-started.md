<script setup>
function playAudio () {
  document.querySelector('#poveste-audio').play()
}
</script>

<audio id="poveste-audio">
  <source src="/poveste.m4a" type="audio/mp4">
</audio>

# Getting started with Poveste

## Overview

> **poveste** is the Romanian word for "story", pronounced `/poˈveste/` (_po-VES-teh_) <button class="btn p-1 leading-none" v-on:click="playAudio"><Icon icon="carbon:volume-up-filled" class="w-4 h-4 align-middle"/></button>. Say it however you like — "po-VEST" works too. Coming from histoire? See the [migration guide](./migration-from-histoire.md).

Poveste is a tool to generate stories applications (or "books").

[Learn more about Poveste here &raquo;](./index.md)

<div class="demo-links-box border-green-200 dark:border-green-900">
  <img src="/vue.svg" alt="Vue logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="vue" />
</div>

<div class="demo-links-box border-emerald-200 dark:border-emerald-900">
  <img src="/nuxt.svg" alt="Nuxt logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="nuxt" />
</div>

<div class="demo-links-box border-orange-200 dark:border-orange-900">
  <img src="/svelte.svg" alt="Svelte logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="svelte" />
</div>

## Supported versions

Each row below is the range Poveste actually declares in `peerDependencies`, next to the
thing that proves it. We deliberately do not advertise versions we cannot test — if a range
is wider than the CI job behind it, the range is the bug.

| | Supported | Proven by |
| --- | --- | --- |
| [Node](https://nodejs.org) | `>=26` | every workflow runs Node 26 |
| [Vite](https://vite.dev) | `^8.0.0` | every example |
| [Vue](https://vuejs.org) | `^3.5.26` | `examples/vue3` — build + Playwright (`Vue 3 tests`) |
| [Nuxt](https://nuxt.com) | `^4.5.0` | `examples/nuxt4` — build + Playwright (`Nuxt 4 tests`) |
| [Svelte](https://svelte.dev) | `^5.46.4` | `examples/svelte5` — build + Playwright (`Svelte 5 tests`) |
| [SvelteKit](https://svelte.dev/docs/kit)* | `^2.53.0` | `examples/sveltekit` — build + Playwright + `svelte-check` (`SvelteKit tests`) |

Vite 8 is a hard floor, not a preference: Poveste's own build runs on Rolldown. That is also
what sets the Nuxt and Svelte floors — Nuxt only moved to Vite 8 in `4.5.0`, and Svelte 4's
last compatible `@sveltejs/vite-plugin-svelte` (v3) caps at Vite 5, so no release pairs
Svelte 4 with the Vite we require.

The same chain sets the exact Svelte number. Vite 8 forces
`@sveltejs/vite-plugin-svelte@^7` — the first major to peer it — and v7 in turn requires
`svelte@^5.46.4`. Svelte `5.0`–`5.46.3` therefore cannot be assembled into a working Poveste
project at all, which is why the range starts where it does rather than at `^5.0.0`.

\* **SvelteKit is declared as an _optional_ peer.** `@poveste/plugin-svelte` drives plain
Svelte and SvelteKit alike, so a plain-Svelte project has no `@sveltejs/kit` installed and a
required peer would warn on every such install. Optional means the range is enforced when
Kit is present and ignored when it is not. See [the SvelteKit
section](./svelte/getting-started.md#sveltekit).

Node is the one exception to "declared in `peerDependencies`": the published
packages carry no `engines` field, so nothing stops you installing on an older Node. `>=26`
is what CI runs and therefore all we can vouch for. Older Node may well work — Vite 8 itself
allows `^20.19.0 || >=22.12.0` — but you would be the one testing it.

### Package managers

CI runs [pnpm](https://pnpm.io) `11.20.0`, so that is the best-tested path. **npm** is
covered too, by a release-gating smoke test that packs the real tarballs, installs them into
a throwaway project with `npm install` — no workspace symlinks — and runs a real
`poveste build`. **Yarn** is not tested; it is expected to work and reports are welcome.

### Version policy

- **One major per framework.** We support the latest major of each framework and drop the
  previous one when keeping it would mean shipping a combination no CI job runs.
- **Ranges follow the tests, not the other way round.** When a floor rises, the example and
  its workflow move first; the `peerDependencies` range follows in the same change.
- **Floors move in minor releases** while Poveste is pre-1.0, and are always called out in
  the release notes as a breaking change.
- **The commit type picks the number.** A `feat` lands a minor, everything else lands a patch —
  the same field [changelogithub](https://github.com/antfu/changelogithub) groups the release
  notes by, so the notes and the version can't disagree.
- **Milestones are targets, not guarantees.** A milestone names the release its issues are aimed
  at. What actually publishes is whatever was ready; the number still comes from the commit
  types, so the notes and the version cannot disagree.
- **Toolchain work is a standing track, not a milestone.** `track:toolchain` issues ride along
  with whatever version is shipping instead of being batched into one; that's why they sit in
  *Backlog* rather than under a version milestone.
- **Majors are declared, not derived.** No commit type produces one. Pre-1.0 a breaking change
  lands in a minor, so nothing in the log will ever add up to a major on its own.

### What 1.0 means

1.0 is a promise that the public surface — the config file, the `Hst` global, `<Story>` and
`<Variant>` props, the plugin interface and the package names — will not break without a major.

The [Stable surface](https://github.com/poveste-dev/poveste/milestone/6) milestone is that
promise's checklist. Everything in it either costs a major to fix afterwards, or is something we
already advertise and do not yet deliver. When the milestone is empty the 1.0 conversation is
open — it does not happen by itself, and the issues in it are the whole answer to "what is 1.0
waiting for?".

## Supported frameworks

| Framework | Support* | Auto-CodeGen* | Auto-Docs* |
| --------- | ------- | ------------ | ---- |
| [Vue →](./vue/getting-started.md) | ✅ | ✅ | 🏗️ |
| [Nuxt →](./vue/getting-started.md#nuxt) | ✅ | ✅ | 🏗️ |
| [Svelte →](./svelte/getting-started.md) | ✅ | - | 🏗️ |
| [SvelteKit →](./svelte/getting-started.md#sveltekit) | ✅ | - | 🏗️ |
| Solid | - | - | - |
| Angular | - | - | - |
| React | - ([Alternative](https://www.ladle.dev)) | - | - |

**<u>Support</u> means the following is available*:
- Collect and render stories
- Render controls pane content with state sync
- Builtin controls wrappers
- Static source

*<u>*Auto-CodeGen*</u>: Generates copiable source code dynamically from the current story state. Generally requires a Virtual DOM.

*<u>*Auto-Docs*</u>: Generates documentation and controls automatically by analyzing the imported components.

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
