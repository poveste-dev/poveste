import { describe, expect, it } from 'vitest'
import { chunkFor, OWN_PACKAGES } from '../build.js'

// Literal ids, never built with `path`: the Windows job runs this file too.
const ROUTES: [id: string, chunk: string | undefined][] = [
  // Installed from npm, poveste's own packages are left to the bundler (#1695).
  ['/book/node_modules/@poveste/plugin-vue/dist/client/index.js', undefined],
  ['/book/node_modules/@poveste/shared/dist/index.js', undefined],
  ['/book/node_modules/@poveste/app/dist/app.js', undefined],
  ['/book/node_modules/@poveste/controls/dist/index.es.js', undefined],
  ['/book/node_modules/@poveste/vendors/pinia.js', undefined],
  ['/book/node_modules/poveste/dist/client/client.js', undefined],
  ['/book/node_modules/.pnpm/poveste@0.24.0/node_modules/poveste/dist/client/client.js', undefined],
  ['/book/node_modules/.pnpm/@poveste+plugin-vue@0.24.0/node_modules/@poveste/plugin-vue/dist/client/index.js', undefined],
  ['C:\\book\\node_modules\\@poveste\\plugin-vue\\dist\\client\\index.js', undefined],
  ['C:\\book\\node_modules\\poveste\\dist\\client\\client.js', undefined],

  // The aliased copies the chrome runs on are third-party code.
  ['/book/node_modules/poveste-pinia/dist/pinia.mjs', 'vendor'],
  ['/book/node_modules/poveste-vue/dist/vue.runtime.esm-bundler.js', 'vendor'],
  ['/book/node_modules/@poveste/vendors/node_modules/poveste-pinia/dist/pinia.mjs', 'vendor'],
  ['C:\\book\\node_modules\\poveste-pinia\\dist\\pinia.mjs', 'vendor'],
  // So is a dependency npm nests inside one of ours.
  ['/book/node_modules/@poveste/app/node_modules/pinia/dist/pinia.mjs', 'vendor'],
  ['/book/node_modules/poveste/node_modules/vue/dist/vue.runtime.esm-bundler.js', 'vendor'],
  // Generated story files, such as the Tailwind plugin's tokens story.
  ['/book/node_modules/.poveste/plugin-tailwind/Tokens.story.js', 'vendor'],

  // In the workspace they are linked source, with no `node_modules` in the path.
  ['/repo/packages/poveste-plugin-vue/dist/client/index.js', undefined],
  ['/repo/packages/poveste/dist/client/client.js', undefined],
  ['/repo/examples/vue/src/poveste.setup.ts', undefined],
  ['C:\\repo\\packages\\poveste-shared\\dist\\index.js', undefined],

  ['/book/node_modules/vue/dist/vue.runtime.esm-bundler.js', 'vendor'],
  ['/book/node_modules/shiki/dist/langs/vue.mjs', 'highlighter'],
  ['/book/node_modules/@shikijs/core/dist/index.mjs', 'highlighter'],
  ['/book/node_modules/shiki/dist/wasm.mjs', 'shiki-wasm'],
  ['/book/node_modules/@shikijs/engine-oniguruma/dist/wasm-inlined.mjs', 'shiki-wasm'],
  ['C:\\book\\node_modules\\shiki\\dist\\langs\\vue.mjs', 'highlighter'],
  ['/book/node_modules/axe-core/axe.min.js', 'axe'],
  ['C:\\book\\node_modules\\axe-core\\axe.min.js', 'axe'],
  ['\0vite/preload-helper.js', 'app-runtime'],
  ['vite/modulepreload-polyfill.js', 'app-runtime'],
]

describe('chunkFor', () => {
  it.each(ROUTES)('%s → %s', (id, chunk) => {
    expect(chunkFor(id)).toBe(chunk)
  })

  it('leaves what `excludeFromVendorsChunk` names to the bundler, by substring or pattern', () => {
    const id = '/book/node_modules/lottie-web/build/player/lottie.js'

    expect(chunkFor(id)).toBe('vendor')
    expect(chunkFor(id, ['lottie-web'])).toBeUndefined()
    expect(chunkFor(id, [/lottie/])).toBeUndefined()
    expect(chunkFor(id, ['floating-vue'])).toBe('vendor')
  })

  it('knows poveste\'s own packages by a separator after `poveste`, so an aliased copy is not one', () => {
    expect(OWN_PACKAGES.test('/node_modules/poveste/dist/index.js')).toBe(true)
    expect(OWN_PACKAGES.test('/node_modules/poveste-pinia/dist/pinia.mjs')).toBe(false)
    expect(OWN_PACKAGES.test('/node_modules/povestefoo/index.js')).toBe(false)
    expect(OWN_PACKAGES.test('/node_modules/.poveste/index.js')).toBe(false)
  })
})
