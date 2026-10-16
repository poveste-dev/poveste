import { describe, expect, it } from 'vitest'
import { noSupportPluginMessage } from '../stories.js'

const vanilla = [{ id: 'vanilla', patterns: ['**/*.js'], pluginIds: ['vanilla'] }]

// A Quasar book without HstVue() was told only that no support plugin was found
// for its story (#1337).
describe('a story no support plugin collects', () => {
  it('is reported with the plugin its extension needs', () => {
    expect(noSupportPluginMessage('/app/src/Button.story.vue', vanilla))
      .toContain('A `.vue` story needs `HstVue()` from `@poveste/plugin-vue`')
  })

  it('is reported with what the book\'s plugins do collect', () => {
    expect(noSupportPluginMessage('/app/src/Button.story.vue', vanilla))
      .toContain('What this book\'s plugins collect: vanilla (**/*.js).')
  })

  it('keeps the sentence the config reference quotes', () => {
    expect(noSupportPluginMessage('/app/src/Button.story.ts', vanilla))
      .toMatch(/^No support plugin found for file \/app\/src\/Button\.story\.ts\. /)
  })

  it('names no plugin for an extension more than one collects', () => {
    expect(noSupportPluginMessage('/app/src/Button.story.tsx', vanilla)).not.toContain('needs')
  })
})
