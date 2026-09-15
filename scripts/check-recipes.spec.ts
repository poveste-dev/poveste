import { describe, expect, it } from 'vitest'
import { section, tsBlocks } from './check-recipes.ts'
import { removeTrees, tree } from './fixture-tree.ts'
import { runCheck } from './run-check.ts'

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

  it('finds a heading that opens the file', () => {
    // `RECIPES` is built to grow; a recipe on its own page can start at line 1,
    // and reading that as "renamed" is a failure with no defect behind it.
    expect(section('### Quasar\n\n- notes', '### Quasar')).toBe('\n- notes')
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
    expect(tsBlocks(section(page, '### Quasar')!)).toEqual(['export default {}\n'])
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

// The guard this check is exempted for lives in `main()`, and deleting its
// `process.exit(1)` left every assertion above green (#719). So the status is
// asserted over a tree where the guard has to fire, together with the guard's
// own message: a crash on a missing file exits non-zero too, and would pass a
// status-only assertion for the wrong reason. And with no stack trace, because a
// guard that prints and then falls through to a crash on the next read looks the
// same from outside — and exits 0 in any tree where that read happens to work.
describe('the check as a process', () => {
  it('exits 0 over the recipes it actually ships with', () => {
    expect(runCheck('check-recipes.ts').status).toBe(0)
  })

  it('exits non-zero when a recipe\'s section has gone from its page', () => {
    const run = runCheck('check-recipes.ts', ['--root', tree({ 'docs/guide/quasar/getting-started.md': '# Getting started\n\nNo configuration here.\n' })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('has no "## Configuration" section')
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
    removeTrees()
  })
})
