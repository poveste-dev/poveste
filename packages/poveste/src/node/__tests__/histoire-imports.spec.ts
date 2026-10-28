import { describe, expect, it } from 'vitest'
import { povesteSpecifier } from '../histoire-imports.js'

// A histoire book's story and setup files keep their imports after the swap (#1530).
describe('the poveste specifier for a histoire import', () => {
  it.each([
    ['histoire/client', 'poveste/client'],
    ['histoire', 'poveste'],
    ['@histoire/plugin-vue', '@poveste/plugin-vue'],
    ['@histoire/plugin-vue/client', '@poveste/plugin-vue/client'],
    ['@histoire/plugin-svelte', '@poveste/plugin-svelte'],
    ['@histoire/plugin-nuxt', '@poveste/plugin-nuxt'],
    ['@histoire/controls', '@poveste/controls'],
    ['@histoire/vendors/vue', '@poveste/vendors/vue'],
  ])('sends %s to %s', (histoire, poveste) => {
    expect(povesteSpecifier(histoire)).toBe(poveste)
  })

  it.each(['@histoire/plugin-vue2', 'histoire-ui', '@histoire/plugin-vue-extra', 'vue'])('leaves %s alone', (id) => {
    expect(povesteSpecifier(id)).toBeUndefined()
  })
})
