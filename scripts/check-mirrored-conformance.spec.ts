import { describe, expect, it } from 'vitest'
import { checkMirroredConformance, collect, compareMirror, MIRRORS, walkProblems } from './check-mirrored-conformance.ts'
import { tree } from './fixture-tree.ts'

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

    expect(collect(root, PAIR).pairs[0].examined).toEqual([
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

    expect(collect(root, PAIR).pairs[0].missing).toEqual(['mirror/conformance'])
  })
})

describe('walkProblems', () => {
  // The failure this whole issue is about. Both directories exist, both are
  // readable, and the walk selected nothing from either — so empty compares
  // equal to empty and the check reports success over an assertion that never
  // ran. Narrowing the real walk to one extension takes the count from 75 to 0
  // with every other assertion in this file still green.
  it('fails when both directories of a pair exist and neither holds a file', () => {
    const root = tree({ 'src/conformance/': '', 'mirror/conformance/': '' })

    expect(walkProblems(collect(root, PAIR))).toEqual([
      expect.stringContaining('src/conformance and mirror/conformance both exist and neither holds a file'),
    ])
  })

  // The reason it is per pair. `MIRRORS` has three entries, and an aggregate
  // floor is held above zero by the other two while a whole framework's set
  // goes unexamined — the floor silent for the failure it was written for.
  it('names the empty pair even while another pair is healthy', () => {
    const root = tree({
      'a/src/One.story.vue': 'x',
      'a/mirror/One.story.vue': 'x',
      'b/src/': '',
      'b/mirror/': '',
    })
    const pairs = [{ source: 'a/src', mirror: 'a/mirror' }, { source: 'b/src', mirror: 'b/mirror' }]

    expect(walkProblems(collect(root, pairs))).toEqual([
      expect.stringContaining('b/src and b/mirror both exist and neither holds a file'),
    ])
  })

  it('reports three empty pairs as three problems, not one', () => {
    const root = tree({ 'a/src/': '', 'a/mirror/': '', 'b/src/': '', 'b/mirror/': '', 'c/src/': '', 'c/mirror/': '' })
    const pairs = ['a', 'b', 'c'].map(name => ({ source: `${name}/src`, mirror: `${name}/mirror` }))

    expect(walkProblems(collect(root, pairs))).toHaveLength(3)
  })

  // The failure a floor on *reach* does not catch, and the one that actually
  // happened: narrowing the selection took the real check from 75 files
  // compared to 36, exit 0, every other assertion green. Any one of those 36
  // satisfies "it examined something".
  it('fails when a pair held files the walk did not compare', () => {
    const pair = {
      source: 'src/conformance',
      mirror: 'mirror/conformance',
      sourceFiles: new Map(),
      mirrorFiles: new Map(),
      missing: [],
      examined: ['src/conformance/Button.story.vue'],
      offered: 3,
    }

    expect(walkProblems({ pairs: [pair] })).toEqual([
      expect.stringContaining('hold 3 files and the walk compared 1'),
    ])
  })

  // Asserted against a real tree rather than a hand-built `Walk`, so a
  // selection that starts dropping files fails here and not only in review.
  it('compares every file the directories hold', () => {
    const root = tree({
      'src/conformance/Button.story.vue': 'a',
      'src/conformance/fixtures/Thing.vue': 'b',
      'src/conformance/README.md': 'c',
      'mirror/conformance/Button.story.vue': 'a',
      'mirror/conformance/fixtures/Thing.vue': 'b',
      'mirror/conformance/README.md': 'c',
    })

    const walk = collect(root, PAIR)

    expect(walk.pairs[0].examined).toHaveLength(walk.pairs[0].offered)
    expect(walkProblems(walk)).toEqual([])
  })

  // A missing directory is already reported by name, and is a different fault
  // with a different fix. Saying both would send the reader to the wrong one.
  it('says only that a directory is missing when one is', () => {
    const root = tree({ 'src/conformance/Button.story.vue': 'a' })

    expect(walkProblems(collect(root, PAIR))).toEqual([
      expect.stringContaining('mirror/conformance does not exist'),
    ])
  })

  it('is silent when the walk read something', () => {
    const root = tree({ 'src/conformance/One.story.vue': 'a', 'mirror/conformance/One.story.vue': 'a' })

    expect(walkProblems(collect(root, PAIR))).toEqual([])
  })
})

describe('checkMirroredConformance', () => {
  /** Every mirrored pair holds the same story, except the first mirror, whose copy differs. */
  function mirrorsWhereTheFirstDrifted(): string {
    return tree(Object.fromEntries(MIRRORS.flatMap(({ source, mirror }, index) => [
      [`${source}/Probe.story.vue`, 'same'],
      [`${mirror}/Probe.story.vue`, index === 0 ? 'drifted' : 'same'],
    ])))
  }

  it('reports a mirror that has drifted from its source', () => {
    const root = mirrorsWhereTheFirstDrifted()

    expect(checkMirroredConformance(root)).toContainEqual(expect.stringContaining('differs between'))
  })
})

// The check itself, over this repository rather than a fixture.
it('every mirrored conformance story is identical to its source', { tags: ['check', 'examples'] }, () => {
  expect(checkMirroredConformance(), 'Run `pnpm run sync:conformance` to rewrite the mirrors from their source, or add the file to MIRROR_EXCEPTIONS in scripts/check-mirrored-conformance.ts if it should differ.').toEqual([])
})
