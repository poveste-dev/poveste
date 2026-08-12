---
layout: home

hero:
  name: Poveste
  text: A new way to write stories
  tagline: Powered by Vite
  image:
    src: /logo.svg
    alt: Poveste logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why Poveste?
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/poveste-dev/poveste

features:
  - title: 📖 Stories
    details: Write stories to showcase and document your components.
  - title: ⚡ Fast
    details: Incredibly fast development building and production page loading!
  - title: 🔧️ No-config
    details: Sane and configurable defaults, automatically reuses your Vite config!
  - title: 🎨 Themable
    details: Customize the look of the generated app with your own branding.
  - title: 💻️ Copyable code
    details: Automatically generates dynamic template source code!
  - title: 🌙 Dark mode
    details: Enjoy a more pleasing experience during night.
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
    href="./guide/vue3/getting-started.html"
    class="p-10 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-green-100 flex items-center"
  >
    <img src="/vue.svg" alt="Vue logo" class="w-16 h-16 object-contain" />
  </a>
  <a
    href="./guide/vue3/getting-started.html#nuxt"
    class="p-10 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-emerald-100 flex items-center"
  >
    <img src="/nuxt.svg" alt="Nuxt logo" class="w-16 h-16 object-contain" />
  </a>
  <a
    href="./guide/svelte3/getting-started.html"
    class="p-10 rounded bg-gray-100 dark:bg-gray-900 transition-colors hover:bg-orange-100 flex items-center"
  >
    <img src="/svelte.svg" alt="Svelte logo" class="w-16 h-16 object-contain" />
  </a>
</div>

<style lang="postcss" scoped>
/* v4: @apply in a scoped <style> needs the theme referenced explicitly. */
@reference "./.vitepress/theme/style/index.pcss";

h2 {
  @apply text-center text-2xl md:text-3xl;
}
</style>
