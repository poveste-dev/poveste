import { povesteTesting } from '@poveste/plugin-solid/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [povesteTesting()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.story.test.ts'],
  },
}))
