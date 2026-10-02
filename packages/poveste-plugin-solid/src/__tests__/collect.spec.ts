import type { ServerStory } from '@poveste/shared'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { run } from '../collect/index'

/** A story file on disk, since collection imports it by path. */
async function collect(source: string): Promise<ServerStory[]> {
  const dir = mkdtempSync(join(tmpdir(), 'poveste-solid-collect-'))
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'Button.story.mjs')
  writeFileSync(path, source)
  const storyData: ServerStory[] = []
  await run({ file: { id: 'src-button-story-tsx', fileName: 'Button', moduleId: path }, storyData } as any)
  return storyData
}

describe('collecting a Solid story file', () => {
  it('reads each declared variant without calling its render', async () => {
    const [story] = await collect(`export default {
      title: 'Button',
      variants: [
        { id: 'primary', title: 'Primary', render: () => { throw new Error('rendered while collecting') } },
        { title: 'Ghost', render: () => null },
      ],
    }`)

    expect(story?.title).toBe('Button')
    expect(story?.variants.map(v => [v.id, v.title])).toEqual([['primary', 'Primary'], ['src-button-story-tsx-1', 'Ghost']])
  })

  it('gives a story with only its own render one implicit variant', async () => {
    const [story] = await collect(`export default { render: () => null }`)

    expect(story?.title).toBe('Button')
    expect(story?.variants.map(v => v.id)).toEqual(['_default'])
  })
})
