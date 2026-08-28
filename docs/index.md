---
layout: home
titleTemplate: Component playgrounds for Vue, Nuxt, Svelte, SvelteKit and Quasar

hero:
  name: Poveste
  text: Component stories for five frameworks
  tagline: A drop-in fork of histoire — same stories, same config, actively developed.
  image:
    src: /logo.svg
    alt: Poveste logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Coming from histoire?
      link: /guide/migration-from-histoire
    - theme: alt
      text: View on GitHub
      link: https://github.com/poveste-dev/poveste

features:
  - title: 🔁 Drop-in for histoire
    details: Your stories, your config file and your plugin names keep working. The old names are still accepted, so the move is an install rather than a rewrite.
  - title: 🧩 Five frameworks, each proven in CI
    details: Vue 3, Nuxt 4, Svelte 5, SvelteKit and Quasar. Every one has its own example book, built and end-to-end tested on every commit.
  - title: 🔧️ Reuses your Vite config
    details: Your aliases, plugins and defines already apply. Where a framework plugin needs handling, that is the framework plugin's job, not yours.
  - title: ⚡ Fast
    details: Stories are collected in parallel worker threads and served by Vite, so the book starts in seconds and reloads as you type.
  - title: 🎨 Yours to brand
    details: Theme the generated app, inject your own CSS and JS, and ship a book that looks like your design system rather than a tool.
  - title: 🌙 Dark mode
    details: For the app and for your stories, with the sandbox told which scheme it is rendering in.
---

<!-- Frameworks -->

<h2 class="text-center !text-lg mt-12 mb-6">
  Choose your framework
</h2>

<!-- `items-stretch` so the tiles match height: VitePress styles `img` height as
auto, which beats Tailwind's layered `h-16`, so each logo keeps its own aspect
ratio and the boxes would otherwise be ragged. -->
<div class="flex items-stretch justify-center gap-4 flex-wrap">
  <a
    href="./guide/vue/getting-started.html"
    class="w-40 p-6 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-green-100 dark:hover:bg-green-950 flex flex-col items-center justify-center gap-3"
  >
    <img src="/vue.svg" alt="" class="w-12 h-12 object-contain" />
    <span class="text-sm font-medium">Vue 3</span>
  </a>
  <a
    href="./guide/vue/getting-started.html#nuxt"
    class="w-40 p-6 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950 flex flex-col items-center justify-center gap-3"
  >
    <img src="/nuxt.svg" alt="" class="w-12 h-12 object-contain" />
    <span class="text-sm font-medium">Nuxt 4</span>
  </a>
  <a
    href="./guide/svelte/getting-started.html"
    class="w-40 p-6 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950 flex flex-col items-center justify-center gap-3"
  >
    <img src="/svelte.svg" alt="" class="w-12 h-12 object-contain" />
    <span class="text-sm font-medium">Svelte 5</span>
  </a>
  <a
    href="./guide/svelte/getting-started.html#sveltekit"
    class="w-40 p-6 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950 flex flex-col items-center justify-center gap-3"
  >
    <img src="/svelte.svg" alt="" class="w-12 h-12 object-contain" />
    <span class="text-sm font-medium">SvelteKit</span>
  </a>
  <a
    href="./guide/config.html#quasar"
    class="w-40 p-6 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-sky-100 dark:hover:bg-sky-950 flex flex-col items-center justify-center gap-3"
  >
    <span class="w-12 h-12 flex items-center justify-center text-3xl" aria-hidden="true">Q</span>
    <span class="text-sm font-medium">Quasar</span>
  </a>
</div>

<style lang="postcss" scoped>
/* v4: @apply in a scoped <style> needs the theme referenced explicitly. */
@reference "./.vitepress/theme/style/index.pcss";

h2 {
  @apply text-center text-2xl md:text-3xl;
}
</style>
