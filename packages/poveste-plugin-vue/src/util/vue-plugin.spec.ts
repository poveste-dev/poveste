import { describe, expect, it } from 'vitest'
import { noVuePluginMessage } from './vue-plugin.js'

describe('noVuePluginMessage', () => {
  // Vite's own message says to install @vitejs/plugin-vue, which a Quasar project
  // does not need: HstQuasar() is what was missing (#1337).
  it('names HstQuasar() in a Quasar project', () => {
    // By file name: `join` writes the platform's separator, so Windows sees `\\app\\…`.
    const message = noVuePluginMessage('/app', path => /[\\/]quasar\.config\.js$/.test(path))

    expect(message).toContain('`HstQuasar()` from `@poveste/plugin-quasar`')
    expect(message).not.toContain('@vitejs/plugin-vue')
  })

  it('names the Vite plugin anywhere else', () => {
    expect(noVuePluginMessage('/app', () => false)).toContain('Add `@vitejs/plugin-vue` to `vite.config`')
  })
})
