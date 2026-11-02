import { povesteTesting } from '@poveste/plugin-svelte/vitest'
import { defaultClientConditions } from 'vite'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [povesteTesting()],
  resolve: {
    conditions: [...defaultClientConditions],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.story.test.ts'],
  },
}))
