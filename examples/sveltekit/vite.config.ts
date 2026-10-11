import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// Poveste's config is in `poveste.config.ts`; see there for why.
export default defineConfig({
  plugins: [
    sveltekit(),
  ],
})
