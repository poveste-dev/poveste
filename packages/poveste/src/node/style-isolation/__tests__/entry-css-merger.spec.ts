import type { Rolldown } from 'vite'
import { describe, expect, it } from 'vitest'
import { entryCssMergerPlugin, hoistImports } from '../entry-css-merger.js'
import { USER_CSS_MARK_END, USER_CSS_MARK_START } from '../vite-plugin.js'

function fakeChunk(name: string, importedCss: string[], code = '', extra: Partial<any> = {}) {
  return {
    type: 'chunk' as const,
    name,
    fileName: `${name}.js`,
    code,
    isEntry: true,
    viteMetadata: { importedCss: new Set(importedCss), importedAssets: new Set() },
    facadeModuleId: null,
    moduleIds: [],
    imports: [],
    dynamicImports: [],
    exports: [],
    map: null,
    modules: {},
    ...extra,
  } as any
}

function fakeAsset(fileName: string, source: string) {
  return { type: 'asset' as const, fileName, source, name: fileName, needsCodeReference: false } as any
}

function mark(css: string): string {
  return `${USER_CSS_MARK_START}\n${css}\n${USER_CSS_MARK_END}\n`
}

// Rolldown ignores assignment to `bundle` in generateBundle, so merged CSS is
// added via this.emitFile. Capture those emits to assert on them.
function runMerger(plugin: any, bundle: Rolldown.OutputBundle) {
  const emitted = new Map<string, any>()
  const ctx = {
    emitFile: (file: any) => {
      emitted.set(file.fileName, file)
      return file.fileName
    },
  }
  ;(plugin.generateBundle as any).call(ctx, {}, bundle)
  return emitted
}

describe('entry-css-merger', () => {
  it('produces one CSS asset per entry chunk', async () => {
    const plugin = entryCssMergerPlugin()
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': fakeChunk('bundle-main', ['route1.css', 'route2.css']),
      'bundle-sandbox.js': fakeChunk('bundle-sandbox', ['sandbox-route.css']),
      'route1.css': fakeAsset('route1.css', 'a {}'),
      'route2.css': fakeAsset('route2.css', 'b {}'),
      'sandbox-route.css': fakeAsset('sandbox-route.css', 'c {}'),
    }
    const emitted = runMerger(plugin, bundle)

    const cssAssets = [...emitted.values()].filter(a => a.fileName.endsWith('.css'))
    expect(cssAssets).toHaveLength(2)
    const mainCss = emitted.get('bundle-main.css')
    const sandboxCss = emitted.get('bundle-sandbox.css')
    expect(mainCss?.source).toContain('a {}')
    expect(mainCss?.source).toContain('b {}')
    expect(sandboxCss?.source).toContain('c {}')

    // The per-chunk CSS assets are dropped from the bundle once merged.
    expect(bundle['route1.css']).toBeUndefined()
    expect(bundle['route2.css']).toBeUndefined()
    expect(bundle['sandbox-route.css']).toBeUndefined()
  })

  it('wraps marked user CSS in @scope on the main entry when isolation is enabled', async () => {
    const plugin = entryCssMergerPlugin({
      isolateStyles: true,
      scopeRoot: '.__poveste-render-story',
      mainEntryName: 'bundle-main',
    })
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': fakeChunk('bundle-main', ['user.css', 'chrome.css']),
      'user.css': fakeAsset('user.css', mark('body { color: red }')),
      'chrome.css': fakeAsset('chrome.css', '@scope (.poveste-app-root) { .x {} }'),
    }
    const emitted = runMerger(plugin, bundle)

    const main = emitted.get('bundle-main.css')
    expect(main.source).toContain('@scope (.__poveste-render-story)')
    expect(main.source).toContain('color: red')
    expect(main.source).toContain('@scope (.poveste-app-root)')
    expect(main.source).not.toContain(USER_CSS_MARK_START)
  })

  it('strips markers without wrapping on the sandbox entry', async () => {
    const plugin = entryCssMergerPlugin({
      isolateStyles: true,
      scopeRoot: '.__poveste-render-story',
      mainEntryName: 'bundle-main',
    })
    const bundle: Rolldown.OutputBundle = {
      'bundle-sandbox.js': fakeChunk('bundle-sandbox', ['user.css']),
      'user.css': fakeAsset('user.css', mark('body { color: red }')),
    }
    const emitted = runMerger(plugin, bundle)

    const sandbox = emitted.get('bundle-sandbox.css')
    expect(sandbox.source).toContain('body')
    expect(sandbox.source).toContain('color: red')
    expect(sandbox.source).not.toContain('@scope')
    expect(sandbox.source).not.toContain(USER_CSS_MARK_START)
  })

  it('attributes CSS from transitively-imported chunks (e.g. vendor)', async () => {
    const plugin = entryCssMergerPlugin()
    const main = fakeChunk('bundle-main', ['app.css'], '', { imports: ['vendor.js'], isEntry: true })
    main.fileName = 'bundle-main.js'
    const vendor = { ...fakeChunk('vendor', ['vendor.css']), isEntry: false, fileName: 'vendor.js' }
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': main,
      'vendor.js': vendor,
      'app.css': fakeAsset('app.css', '.app {}'),
      'vendor.css': fakeAsset('vendor.css', '.vendor {}'),
    }
    const emitted = runMerger(plugin, bundle)
    const mainCss = emitted.get('bundle-main.css')
    expect(mainCss.source).toContain('.app')
    expect(mainCss.source).toContain('.vendor')
  })

  it('strips markers without wrapping when isolation is disabled', async () => {
    const plugin = entryCssMergerPlugin({
      isolateStyles: false,
      scopeRoot: '.__poveste-render-story',
      mainEntryName: 'bundle-main',
    })
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': fakeChunk('bundle-main', ['user.css']),
      'user.css': fakeAsset('user.css', mark('body { color: red }')),
    }
    const emitted = runMerger(plugin, bundle)

    const main = emitted.get('bundle-main.css')
    expect(main.source).not.toContain('@scope')
    expect(main.source).not.toContain(USER_CSS_MARK_START)
  })
})

// Vite's own CSS minifier stripped the sentinels before the merger looked for them, and
// every story's CSS shipped unscoped (#1441). Minified here, it is minified after wrapping.
describe('entry-css-merger, minifying', () => {
  it('keeps a story\'s rules inside its scope, minified', () => {
    const plugin = entryCssMergerPlugin({ isolateStyles: true, minify: true })
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': fakeChunk('bundle-main', ['chrome.css', 'story.css']),
      'chrome.css': fakeAsset('chrome.css', '.poveste-chrome {\n  color: red;\n}\n'),
      'story.css': fakeAsset('story.css', mark('.card {\n  padding: 4px;\n}\n')),
    }

    const css = String(runMerger(plugin, bundle).get('bundle-main.css').source)

    expect(css).toMatch(/@scope\s*\(\.__poveste-render-story\)[^{]*\{\.card\{padding:4px\}/)
    expect(css).toContain('.poveste-chrome{color:red}')
    expect(css).not.toContain('__PVT_USER_CSS')
  })
})

// A story stylesheet opening with a font `@import` sat behind the chrome's rules once
// merged: the browser dropped it, and Lightning CSS refused the file (#1441).
describe('a merged file\'s imports', () => {
  const FONT = '@import url(\'https://fonts.example/css2?family=Roboto:wght@0,400;0,500&display=swap\');'

  it('come first, so a minified book with a story font import builds', () => {
    const plugin = entryCssMergerPlugin({ isolateStyles: true, minify: true })
    const bundle: Rolldown.OutputBundle = {
      'bundle-main.js': fakeChunk('bundle-main', ['chrome.css', 'story.css']),
      'chrome.css': fakeAsset('chrome.css', '.poveste-chrome { color: red; }'),
      'story.css': fakeAsset('story.css', mark(`${FONT}\n.card { padding: 4px; }`)),
    }

    const css = String(runMerger(plugin, bundle).get('bundle-main.css').source)

    // Lightning CSS writes `@import url('…')` as `@import "…"`.
    expect(css).toMatch(/^@import (?:url\()?["']?https:\/\/fonts\.example\/css2\?family=Roboto:wght@0,400;0,500&display=swap/)
    expect(css).toMatch(/@scope\s*\(\.__poveste-render-story\)[^{]*\{\.card\{padding:4px\}/)
  })

  it('are read whole, past the `;` a URL can carry, and kept once each', () => {
    expect(hoistImports(`.a{}\n${FONT}\n.b{}\n${FONT}`)).toBe(`${FONT}\n.a{}\n\n.b{}\n`)
  })

  it('leave a file without any as it was', () => {
    expect(hoistImports('.a{}\n.b{}')).toBe('.a{}\n.b{}')
  })
})
