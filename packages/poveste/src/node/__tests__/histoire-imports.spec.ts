import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterAll, describe, expect, it } from 'vitest'
import { histoireScanImports, povesteSpecifier } from '../histoire-imports.js'
import { tempDir } from './temp-dir.js'

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

// The scan pre-bundles an import under the name it resolves, so it has to be the one the page asks for (#1746).
describe('the dependency scan of a histoire import', () => {
  const book = tempDir(join(tmpdir(), 'poveste-histoire-scan-'))
  afterAll(book.remove)

  mkdirSync(join(book.path, 'node_modules/@poveste/plugin-vue'), { recursive: true })
  writeFileSync(join(book.path, 'node_modules/@poveste/plugin-vue/package.json'), '{}')
  const setupFile = join(book.path, 'src/histoire.setup.ts')

  async function scan(id: string, importer: string | undefined) {
    const calls: [string, string][] = []
    const resolveId = histoireScanImports().resolveId as (this: unknown, ...args: unknown[]) => Promise<unknown>
    const result = await resolveId.call({
      resolve: async (specifier: string, from: string) => {
        calls.push([specifier, from])
        return { id: specifier, external: true }
      },
    }, id, importer, { isEntry: false, kind: 'import-statement' })
    return { result, calls }
  }

  it('resolves the poveste name from the book that reaches it', async () => {
    expect(await scan('@histoire/plugin-vue', setupFile)).toEqual({
      result: { id: '@poveste/plugin-vue', external: true },
      calls: [['@poveste/plugin-vue', setupFile]],
    })
  })

  it('keeps the importer of a story\'s script block, which the scan names after its file', async () => {
    const block = `virtual-module:${join(book.path, 'src/Button.story.vue')}?id=0`
    expect((await scan('@histoire/plugin-vue/client', block)).calls).toEqual([['@poveste/plugin-vue/client', block]])
  })

  // Strict pnpm: the book has its plugins but not poveste's own dependencies.
  it('resolves from poveste what the book does not reach', async () => {
    const [[specifier, from]] = (await scan('@histoire/shared', setupFile)).calls
    expect(specifier).toBe('@poveste/shared')
    expect(from).toMatch(/histoire-imports\.[jt]s$/)
  })

  it('leaves any other import to the scan', async () => {
    expect(await scan('vue', setupFile)).toEqual({ result: undefined, calls: [] })
  })
})
