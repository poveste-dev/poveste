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
  <img src="/vue.svg" alt="Vue logo" class="w-10 h-10 mt-3" />
  <DemoLinks framework="vue3" />
</div>

<div class="demo-links-box border-orange-200 dark:border-orange-900">
  <img src="/svelte.svg" alt="Svelte logo" class="w-10 h-10 mt-3" />
  <DemoLinks framework="svelte3" />
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
| [Svelte](https://svelte.dev) | `^5.0.0` | `examples/svelte5` — build + Playwright (`Svelte 5 tests`) |
| [SvelteKit](https://svelte.dev/docs/kit) | `^2.55.0` | `examples/sveltekit` — build + Playwright + `svelte-check` (`SvelteKit tests`) |

Vite 8 is a hard floor, not a preference: Poveste's own build runs on Rolldown. That is also
what sets the Nuxt and Svelte floors — Nuxt only moved to Vite 8 in `4.5.0`, and Svelte 4's
last compatible `@sveltejs/vite-plugin-svelte` (v3) caps at Vite 5, so no release pairs
Svelte 4 with the Vite we require.

The Node row is the one exception to "declared in `peerDependencies`": the published
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

## Supported frameworks

| Framework | Support* | Auto-CodeGen* | Auto-Docs* |
| --------- | ------- | ------------ | ---- |
| [Vue →](./vue3/getting-started.md) | ✅ | ✅ | 🏗️ |
| [Nuxt →](./vue3/getting-started.md#nuxt) | ✅ | ✅ | 🏗️ |
| [Svelte →](./svelte3/getting-started.md) | ✅ | - | 🏗️ |
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
