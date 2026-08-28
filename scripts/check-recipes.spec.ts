import { describe, expect, it } from 'vitest'
import { section, tsBlocks } from './check-recipes.ts'

const PAGE = [
  '## Vite config',
  '',
  '### Quasar',
  '',
  'Some prose.',
  '',
  '```ts',
  '// poveste.config.ts',
  'export default {}',
  '```',
  '',
  '```ts',
  '// src/poveste.setup.ts',
  'export const setupVue3 = () => {}',
  '```',
  '',
  '## Global JS and CSS',
  '',
  '```ts',
  'not part of the recipe',
  '```',
].join('\n')

describe('section', () => {
  it('stops at the next heading, so a later code block is not adopted', () => {
    expect(section(PAGE, '### Quasar')).not.toContain('not part of the recipe')
  })

  it('has nothing when the heading was renamed', () => {
    // Treated as a problem by the caller: a recipe that moved is one nothing
    // guards any more.
    expect(section(PAGE, '### Vike')).toBeUndefined()
  })
})

describe('tsBlocks', () => {
  it('ignores a block that is an illustration rather than a file', () => {
    const page = [
      '### Quasar',
      '',
      '```ts',
      '// poveste.config.ts',
      'export default {}',
      '```',
      '',
      '```ts',
      'app.use(Something)',
      '```',
    ].join('\n')

    // Without this, adding an example to the page would shift every file it is
    // matched against by one.
    expect(tsBlocks(section(`\n${page}`, '### Quasar')!)).toEqual(['export default {}\n'])
  })

  it('drops the path comment, which labels the block rather than belonging to it', () => {
    expect(tsBlocks(section(PAGE, '### Quasar')!)).toEqual([
      'export default {}\n',
      'export const setupVue3 = () => {}\n',
    ])
  })

  it('finds every block under the heading, in order', () => {
    expect(tsBlocks(section(PAGE, '### Quasar')!)).toHaveLength(2)
  })
})
