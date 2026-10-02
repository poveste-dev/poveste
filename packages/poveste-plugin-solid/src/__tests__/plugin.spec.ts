import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HstSolid } from '../index'

describe('the plugin\'s config', () => {
  // Collection imports story files in Node, where Solid's own exports pick its
  // server build and the module-level `template()` its JSX compiles to throws.
  it('aliases Solid to its browser builds, so a story file can be collected', async () => {
    const config = await HstSolid().defaultConfig!({} as any) as any
    const aliases: { find: RegExp, replacement: string }[] = config.vite.resolve.alias

    expect(aliases.map(({ find }) => String(find))).toEqual(['/^solid-js$/', '/^solid-js\\/web$/', '/^solid-js\\/store$/'])
    for (const { replacement } of aliases) {
      expect(readFileSync(replacement, 'utf8')).not.toContain('Client-only API called on the server side')
    }
  })

  it('claims .story.tsx and .story.jsx for itself', async () => {
    const config = await HstSolid().defaultConfig!({} as any) as any

    expect(config.supportMatch).toEqual([{ id: 'solid', patterns: ['**/*.story.tsx', '**/*.story.jsx'], pluginIds: ['solid'] }])
  })
})
