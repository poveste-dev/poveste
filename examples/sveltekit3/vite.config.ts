import adapter from '@sveltejs/adapter-auto'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// SvelteKit 3's shape, as `sv create` writes it: the Kit config lives here, and a
// `svelte.config.js` is an error (#1200). Poveste's own config is beside it rather
// than under a `poveste` key, which this workspace cannot type (#1206).
export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
    }),
  ],
})
