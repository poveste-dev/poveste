import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { collect, compareMirror, MIRRORS, walkProblems } from './check-mirrored-conformance.ts'

const source = new Map([['Button.story.vue', 'a'], ['Grid.story.vue', 'b']])

describe('compareMirror', () => {
  it('is silent when the mirror is a copy', () => {
    expect(compareMirror(source, new Map(source))).toEqual([])
  })

  // The defect this exists for: edit one of a pair, and the failure lands in a
  // book you did not touch as a missing locator (#400).
  it('names a file whose content has drifted', () => {
    const mirror = new Map(source).set('Button.story.vue', 'edited')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Button.story.vue', reason: 'differs' }])
  })

  it('catches a story added to the source and not the mirror', () => {
    const mirror = new Map(source)
    mirror.delete('Grid.story.vue')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Grid.story.vue', reason: 'missing' }])
  })

  // A story left behind in the mirror after being deleted from the source is
  // drift too, and the direction the shared story list would not notice.
  it('catches a story left behind in the mirror', () => {
    const mirror = new Map(source).set('Old.story.vue', 'x')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Old.story.vue', reason: 'extra' }])
  })

  // Intended divergence is a real category — `I18n` and `BaseButton` diverge on
  // purpose elsewhere in these books — so it has to be nameable, not forbidden.
  it('honours an exception, scoped to the mirror it names', () => {
    const mirror = new Map(source).set('Button.story.vue', 'deliberately different')
    const exceptions = new Set(['examples/nuxt4/app/components/conformance/Button.story.vue'])

    expect(compareMirror(source, mirror, exceptions, 'examples/nuxt4/app/components/conformance')).toEqual([])
    // The same filename in another mirror is not covered by it.
    expect(compareMirror(source, mirror, exceptions, 'examples/sveltekit/src/lib/conformance')).toHaveLength(1)
  })

  // A fixture in a subdirectory is part of the set a story imports. Comparing
  // only the top level left it invisible: the check said "identical", the sync
  // copied nothing, and the mirrored books failed at build on a missing import.
  it('compares nested files by their path under the set', () => {
    const withNested = new Map(source).set('fixtures/Thing.vue', 'x')

    expect(compareMirror(withNested, source)).toEqual([{ file: 'fixtures/Thing.vue', reason: 'missing' }])
    expect(compareMirror(source, withNested)).toEqual([{ file: 'fixtures/Thing.vue', reason: 'extra' }])
  })

  it('reports every drifted file rather than only the first', () => {
    const mirror = new Map([['Button.story.vue', 'x'], ['Grid.story.vue', 'y']])

    expect(compareMirror(source, mirror)).toHaveLength(2)
  })
})

describe('mIRRORS', () => {
  // A moved directory would otherwise make the check quietly compare nothing.
  it('names every pair, source first', () => {
    expect(MIRRORS.map(m => `${m.source} -> ${m.mirror}`)).toEqual([
      'examples/vue3/src/conformance -> examples/nuxt4/app/components/conformance',
      'examples/vue3/src/conformance -> examples/quasar/src/conformance',
      'examples/svelte5/src/conformance -> examples/sveltekit/src/lib/conformance',
    ])
  })

  // One source can feed several mirrors — quasar inherits the Vue set that
  // nuxt4 already mirrors, which is what stopped it being written a third time.
  it('allows one source to feed more than one mirror', () => {
    const sources = MIRRORS.map(m => m.source)

    expect(new Set(sources).size).toBeLessThan(sources.length)
  })
})

// Everything above asserts predicates against strings. Nothing above opens a
// file, which is the gap #719 is about: `compareMirror` can be perfect while
// the walk that feeds it reaches nothing, and the check then prints a success
// line with a zero in it.
//
// `collect(root, mirrors)` takes the real values as defaults, so these specs
// point it at a throwaway tree without the check hard-coding anything.

const trees: string[] = []

/**
 * A tree on disk for the walk to read, as `path -> content`.
 *
 * A real directory rather than a mocked `fs`: the thing under test here is
 * whether the walk finds files, and a mock that answers `readdirSync` is an
 * assertion about the mock.
 */
function tree(layout: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'poveste-mirrors-'))
  trees.push(root)

  for (const [path, content] of Object.entries(layout)) {
    mkdirSync(join(root, dirname(path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }

  return root
}

afterEach(() => {
  for (const root of trees.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

const PAIR = [{ source: 'src/conformance', mirror: 'mirror/conformance' }]

describe('collect', () => {
  it('reads both directories of a pair', () => {
    const root = tree({
      'src/conformance/Button.story.vue': 'a',
      'mirror/conformance/Button.story.vue': 'a',
    })

    const { pairs } = collect(root, PAIR)

    expect(pairs[0].sourceFiles.get('Button.story.vue')).toBe('a')
    expect(pairs[0].mirrorFiles.get('Button.story.vue')).toBe('a')
  })

  // The invariant #719 asks every check for: it examined something, and can say
  // what. A count alone would not survive review of the failure it produces.
  it('names every file it opened', () => {
    const root = tree({
      'src/conformance/Button.story.vue': 'a',
      'src/conformance/fixtures/Thing.vue': 'b',
      'mirror/conformance/Button.story.vue': 'a',
      'mirror/conformance/fixtures/Thing.vue': 'b',
    })

    expect(collect(root, PAIR).examined).toEqual([
      'src/conformance/Button.story.vue',
      'src/conformance/fixtures/Thing.vue',
      'mirror/conformance/Button.story.vue',
      'mirror/conformance/fixtures/Thing.vue',
    ])
  })

  // Nested files are part of the set a story imports, and the reason the walk
  // recurses at all. Asserted here against real directories rather than a Map
  // whose keys were typed by hand.
  it('descends into subdirectories', () => {
    const root = tree({
      'src/conformance/fixtures/Thing.vue': 'a',
      'mirror/conformance/fixtures/Thing.vue': 'edited',
    })

    const { pairs } = collect(root, PAIR)

    expect(compareMirror(pairs[0].sourceFiles, pairs[0].mirrorFiles)).toEqual([
      { file: 'fixtures/Thing.vue', reason: 'differs' },
    ])
  })

  it('reports a directory that is not on disk rather than treating it as empty', () => {
    const root = tree({ 'src/conformance/Button.story.vue': 'a' })

    expect(collect(root, PAIR).missing).toEqual(['mirror/conformance'])
  })
})

describe('walkProblems', () => {
  // The failure this whole issue is about. Both directories exist, both are
  // readable, and the walk selected nothing from either — so empty compares
  // equal to empty and the check reports success over an assertion that never
  // ran. Narrowing the real walk to one extension takes the count from 75 to 0
  // with every other assertion in this file still green.
  it('fails when both directories exist and neither yielded a file', () => {
    const root = tree({ 'src/conformance/.keep': '', 'mirror/conformance/.keep': '' })
    const walk = collect(root, PAIR)
    walk.examined.length = 0

    expect(walkProblems(walk)).toEqual([expect.stringContaining('stopped reaching')])
  })

  // A missing directory is already reported by name, and is a different fault
  // with a different fix. Saying both would send the reader to the wrong one.
  it('says only that a directory is missing when one is', () => {
    expect(walkProblems({ pairs: [], missing: ['gone'], examined: [] })).toEqual([
      expect.stringContaining('gone does not exist'),
    ])
  })

  it('is silent when the walk read something', () => {
    expect(walkProblems({ pairs: [], missing: [], examined: ['src/conformance/Button.story.vue'] })).toEqual([])
  })
})

// `collect()` returning files says nothing about what `main()` did with them,
// and the defect is a check *reporting success*. The exit code is how that
// success is expressed, so one spec runs the real thing and reads it.
//
// Only one, and it asserts the status rather than the output: matching on
// console text would make every reworded message a test failure about nothing.
describe('the check as a process', () => {
  it('exits 0 over the repository it actually ships with', () => {
    const check = join(import.meta.dirname, 'check-mirrored-conformance.ts')
    const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', check], { encoding: 'utf8' })

    expect(result.status).toBe(0)
  })
})
