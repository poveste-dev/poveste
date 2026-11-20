import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { chromeScanEntry, optimizeEntries, setupFileEntry } from '../optimize-entries.js'

const STORIES = ['**/*.story.vue', '**/*.story.svelte']
const IGNORED = ['**/node_modules/**', '**/dist/**']

describe('setupFileEntry', () => {
  // Documented and written as `/src/setup.ts`; a glob would read the leading slash
  // as the filesystem root and match nothing.
  it('makes a root-relative pattern out of the documented spelling', () => {
    expect(setupFileEntry('/src/poveste.setup.ts', false)).toBe('src/poveste.setup.ts')
  })

  it('leaves a pattern that is already relative alone', () => {
    expect(setupFileEntry('src/poveste.setup.ts', false)).toBe('src/poveste.setup.ts')
  })

  it('picks the browser file for the client scan', () => {
    expect(setupFileEntry({ browser: '/src/browser.ts' }, false)).toBe('src/browser.ts')
  })

  it('picks the server file for the collection scan', () => {
    expect(setupFileEntry({ server: '/src/server.ts' }, true)).toBe('src/server.ts')
  })

  it('takes neither when the config names the other side', () => {
    expect(setupFileEntry({ server: '/src/server.ts' }, false)).toBeUndefined()
    expect(setupFileEntry({ browser: '/src/browser.ts' }, true)).toBeUndefined()
  })

  it('has nothing to add when no setup file is configured', () => {
    expect(setupFileEntry(undefined, false)).toBeUndefined()
  })
})

describe('optimizeEntries', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'poveste-entries-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  function write(...paths: string[]): void {
    for (const path of paths) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), '<template><Story/></template>')
    }
  }

  const names = (entries: string[]) => entries.map(entry => entry.slice(root.length + 1)).sort()

  it('resolves every story, so the scanner reaches their deps', () => {
    write('src/A.story.vue', 'src/nested/B.story.svelte')

    expect(names(optimizeEntries({ storyMatch: STORIES, storyIgnored: IGNORED, setupFile: undefined }, root, false)))
      .toEqual(['src/A.story.vue', 'src/nested/B.story.svelte'])
  })

  // A negation could not do this job: Vite globs the whole entries array at once, so
  // `!**/dist/**` would also drop APP_PATH, which is `<poveste-app>/dist`.
  it('honours storyIgnored, so a stale dist copy is not scanned', () => {
    write('src/A.story.vue', 'dist/stale/A.story.vue')

    expect(names(optimizeEntries({ storyMatch: STORIES, storyIgnored: IGNORED, setupFile: undefined }, root, false)))
      .toEqual(['src/A.story.vue'])
  })

  it('honours a storyIgnored pattern the user added', () => {
    write('src/A.story.vue', 'src/bench/Huge.story.vue')

    const entries = optimizeEntries(
      { storyMatch: STORIES, storyIgnored: [...IGNORED, '**/src/bench/**'], setupFile: undefined },
      root,
      false,
    )

    expect(names(entries)).toEqual(['src/A.story.vue'])
  })

  it('adds the setup file, which is only reachable through a virtual id', () => {
    write('src/A.story.vue')

    const entries = optimizeEntries({ storyMatch: STORIES, storyIgnored: IGNORED, setupFile: '/src/setup.ts' }, root, false)

    expect(names(entries)).toEqual(['src/A.story.vue', 'src/setup.ts'])
  })

  it('returns just the setup file when the book has no stories yet', () => {
    const entries = optimizeEntries({ storyMatch: STORIES, storyIgnored: IGNORED, setupFile: '/src/setup.ts' }, root, false)

    expect(names(entries)).toEqual(['src/setup.ts'])
  })
})

describe('chromeScanEntry', () => {
  let root: string
  let app: string
  let temp: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'poveste-chrome-entry-'))
    // Where npm's hoisted layout puts the chrome.
    app = join(root, 'node_modules/@poveste/app/dist')
    temp = join(root, 'node_modules/.poveste')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  function writeApp(...entries: string[]): void {
    mkdirSync(app, { recursive: true })
    for (const entry of entries) {
      writeFileSync(join(app, entry), '')
    }
  }

  const imported = (file: string) => [...readFileSync(file, 'utf8').matchAll(/import "([^"]+)"/g)]
    .map(([, specifier]) => resolve(dirname(file), specifier!))

  // Vite's scan drops entries under `dist`, which is where the chrome's own sit.
  it('imports the chrome\'s entries from a file outside dist', () => {
    writeApp('bundle-main.js', 'bundle-sandbox.js')

    const [entry] = chromeScanEntry(app, temp)

    expect(relative(root, entry!)).toBe('node_modules/.poveste/chrome-scan-entry.js')
    expect(imported(entry!)).toEqual([join(app, 'bundle-main.js'), join(app, 'bundle-sandbox.js')])
  })

  it('imports only the entries that exist', () => {
    writeApp('bundle-main.js')

    const [entry] = chromeScanEntry(app, temp)

    expect(imported(entry!)).toEqual([join(app, 'bundle-main.js')])
  })

  it('has nothing to add, and writes nothing, when the chrome has no entries', () => {
    expect(chromeScanEntry(app, temp)).toEqual([])
    expect(existsSync(temp)).toBe(false)
  })

  // The directory is watched, so a rewrite on every start would be a change to react to.
  it('leaves an unchanged entry alone', () => {
    writeApp('bundle-main.js', 'bundle-sandbox.js')
    const [entry] = chromeScanEntry(app, temp)
    const written = statSync(entry!).mtimeMs

    chromeScanEntry(app, temp)

    expect(statSync(entry!).mtimeMs).toBe(written)
  })
})
