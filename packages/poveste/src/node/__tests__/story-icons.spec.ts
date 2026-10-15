import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { storyIconNames, storyIcons } from '../virtual/story-icons.js'

function book(collections: Record<string, object>) {
  const root = mkdtempSync(path.join(tmpdir(), 'poveste-story-icons-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(path.join(root, 'package.json'), '{}')
  for (const [prefix, data] of Object.entries(collections)) {
    const dir = path.join(root, 'node_modules', '@iconify-json', prefix)
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `@iconify-json/${prefix}` }))
    writeFileSync(path.join(dir, 'icons.json'), JSON.stringify({ prefix, ...data }))
  }
  return root
}

function storyFiles(...icons: (string | undefined)[][]) {
  return icons.map(([story, ...variants]) => ({
    story: { icon: story, variants: variants.map(icon => ({ icon })) },
  })) as any
}

// An icon a story named was fetched from api.iconify.design when it showed (#255).
describe('the icons a book bundles', () => {
  it('are the named ones, from the book\'s installed collection', () => {
    const root = book({ carbon: { icons: { notebook: { body: '<path/>' }, bookmark: { body: '<g/>' } }, width: 32, height: 32 } })

    expect(storyIcons({ root, storyFiles: storyFiles(['carbon:notebook']) })).toEqual([
      { prefix: 'carbon', icons: { notebook: { body: '<path/>' } }, aliases: {}, width: 32, height: 32 },
    ])
  })

  // A made-up collection: a real one can resolve through the `NODE_PATH` that
  // `pnpm exec` sets, to the workspace's hoisted copy, even from a temp directory.
  it('leave out a collection the book has not installed, which still loads at runtime', () => {
    const root = book({})

    expect(storyIcons({ root, storyFiles: storyFiles(['poveste-no-such-collection:icon']) })).toEqual([])
  })

  it('bring an alias\'s parent along with it', () => {
    const root = book({ mdi: { icons: { home: { body: '<p/>' } }, aliases: { house: { parent: 'home' } } } })

    expect(storyIcons({ root, storyFiles: storyFiles(['mdi:house']) })).toEqual([
      { prefix: 'mdi', icons: { home: { body: '<p/>' } }, aliases: { house: { parent: 'home' } } },
    ])
  })

  it('are read from variants as well as stories, and only in prefix:name form', () => {
    expect(storyIconNames({ storyFiles: storyFiles(['carbon:a', 'el:b', undefined, 'not an icon']) })).toEqual(['carbon:a', 'el:b'])
  })
})
