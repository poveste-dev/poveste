import { describe, expect, it } from 'vitest'
import { HstSolid } from '../index'

describe('the plugin\'s config', () => {
  // Collection imports story files in Node, where Solid's own exports pick its
  // server build and the module-level `template()` its JSX compiles to throws.
  // Browser conditions alone missed `solid-js/html`, which Node loaded and which
  // then imported the server `solid-js/web`; inlining keeps it all in Vite.
  it('collects with Solid resolved to its browser build and kept inside Vite', async () => {
    const config = await HstSolid().defaultConfig!({} as any) as any

    expect(config.vite.ssr.resolve.conditions[0]).toBe('browser')
    expect(config.vite.ssr.noExternal).toEqual(['solid-js'])
  })

  it('claims .story.tsx and .story.jsx for itself', async () => {
    const config = await HstSolid().defaultConfig!({} as any) as any

    expect(config.supportMatch).toEqual([{ id: 'solid', patterns: ['**/*.story.tsx', '**/*.story.jsx'], pluginIds: ['solid'] }])
  })

  // Joined to core's globs by the config merger, so a Solid book needs no
  // `storyMatch` of its own (#1124).
  it('declares the story globs a Solid book uses', async () => {
    const config = await HstSolid().defaultConfig!({} as any) as any

    expect(config.storyMatch).toEqual(['**/*.story.tsx', '**/*.story.jsx'])
  })
})
