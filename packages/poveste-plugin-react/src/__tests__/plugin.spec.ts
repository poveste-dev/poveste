import { describe, expect, it } from 'vitest'
import { HstReact } from '../index'

describe('the plugin\'s config', () => {
  // A second React is "Invalid hook call" the first time a story uses a hook.
  it('resolves one React for the story and the renderer', async () => {
    const config = await HstReact().defaultConfig!({} as any) as any

    expect(config.vite.resolve.dedupe).toEqual(['react', 'react-dom'])
  })

  // Found in two passes, `react-dom/client` imported a chunk the first pass had
  // already replaced, and no story rendered in dev until the cache was cleared.
  it('pre-bundles every React entry the renderer and a story import, in one pass', async () => {
    const config = await HstReact().defaultConfig!({} as any) as any

    expect(config.vite.optimizeDeps.include).toEqual(expect.arrayContaining(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime']))
  })

  it('claims .story.tsx and .story.jsx for itself', async () => {
    const config = await HstReact().defaultConfig!({} as any) as any

    expect(config.supportMatch).toEqual([{ id: 'react', patterns: ['**/*.story.tsx', '**/*.story.jsx'], pluginIds: ['react'] }])
  })
})
