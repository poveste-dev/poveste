import type { DocgenExtractor } from '@poveste/shared'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor.js'

// A book with no tsconfig whose stories reach components beside its root, as
// `@poveste/controls-stories` does with `storyMatch: ['../poveste-controls/src/**']` (#1559).
const FIXTURE = fileURLToPath(new URL('../../../fixtures/docgen-outside', import.meta.url))

let extractor: DocgenExtractor
beforeAll(async () => {
  extractor = await createExtractor({ root: join(FIXTURE, 'book'), options: {} })
})
afterAll(() => extractor.dispose())

describe('a book with no tsconfig', () => {
  it('reads a component outside its root, with the types it imports', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'lib/Button.vue'))

    expect(doc!.props).toEqual([
      expect.objectContaining({ name: 'label', type: 'string', description: 'The text on the button.', required: true }),
      expect.objectContaining({ name: 'size', type: '"sm" | "md" | undefined' }),
    ])
  }, 60_000)

  it('reads a component a script file outside its root exports', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'lib/Presence.ts'))

    expect(doc?.props).toEqual([expect.objectContaining({ name: 'present', required: true })])
  }, 60_000)

  it('reports a component outside its root among the files to watch', async () => {
    await extractor.extract(join(FIXTURE, 'lib/Button.vue'))

    expect(extractor.sources?.()).toEqual(expect.arrayContaining([join(FIXTURE, 'lib/Button.vue'), join(FIXTURE, 'lib/button-props.ts')]))
  }, 60_000)

  it('still reads a component inside its root', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'book/Inside.vue'))

    expect(doc!.props).toEqual([expect.objectContaining({ name: 'label', type: 'string' })])
  }, 60_000)
})

// Outside the repository, so nothing is installed up the component's tree: inside it,
// the workspace's `node_modules` answers, and the case can't happen (#1580).
describe('a component with nothing installed up its tree', () => {
  const withProp = (name: string) => `<script setup lang="ts">\ndefineProps<{ ${name}: string }>()\n</script>\n\n<template>\n  <button />\n</template>\n`
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-docgen-outside-')))
  const vue = dirname(createRequire(import.meta.url).resolve('vue/package.json'))
  let outside: DocgenExtractor

  beforeAll(async () => {
    mkdirSync(join(dir, 'book/node_modules'), { recursive: true })
    mkdirSync(join(dir, 'lib'))
    symlinkSync(vue, join(dir, 'book/node_modules/vue'), 'junction')
    writeFileSync(join(dir, 'lib/Btn.vue'), withProp('label'))
    writeFileSync(join(dir, 'book/Inside.vue'), '<script setup lang="ts">\nconst emit = defineEmits<{ press: [event: MouseEvent], close: [] }>()\nconst value = defineModel<string>(\'value\')\n</script>\n\n<template>\n  <button @click="emit(\'press\', $event)">{{ value }}</button>\n</template>\n')
    outside = await createExtractor({ root: join(dir, 'book'), options: {} })
  })
  afterAll(() => {
    outside.dispose()
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads its props with the `vue` the book has', async () => {
    const doc = await outside.extract(join(dir, 'lib/Btn.vue'))

    expect(doc!.props).toEqual([expect.objectContaining({ name: 'label', type: 'string', required: true })])
  }, 60_000)

  it('leaves a component inside the root reading as it did, after one outside it', async () => {
    await outside.extract(join(dir, 'lib/Btn.vue'))

    const doc = await outside.extract(join(dir, 'book/Inside.vue'))

    expect(doc!.events?.map(event => event.name)).toEqual(['update:value', 'press', 'close'])
  }, 60_000)

  it('lists the same events with the mapping as without it, in the order its program gives', async () => {
    copyFileSync(join(dir, 'book/Inside.vue'), join(dir, 'lib/Outside.vue'))

    const doc = await outside.extract(join(dir, 'lib/Outside.vue'))

    expect(doc!.events?.map(event => event.name).sort()).toEqual(['close', 'press', 'update:value'])
  }, 60_000)

  it('leaves a runtime `defineEmits` inside the root in the order it declares', async () => {
    writeFileSync(join(dir, 'book/Runtime.vue'), '<script setup lang="ts">\nconst emit = defineEmits([\'press\', \'close\', \'alpha\'])\n</script>\n\n<template>\n  <button @click="emit(\'press\')" />\n</template>\n')

    const doc = await outside.extract(join(dir, 'book/Runtime.vue'))

    expect(doc!.events?.map(event => event.name)).toEqual(['press', 'close', 'alpha'])
  }, 60_000)

  it('doesn\'t watch the book\'s other components when it has read only one outside the root', async () => {
    const extractor = await createExtractor({ root: join(dir, 'book'), options: {} })

    await extractor.extract(join(dir, 'lib/Btn.vue'))

    expect(extractor.sources?.()).not.toContain(join(dir, 'book/Inside.vue'))
    extractor.dispose()
  }, 60_000)

  it('reports both among the files to watch', async () => {
    await outside.extract(join(dir, 'lib/Btn.vue'))
    await outside.extract(join(dir, 'book/Inside.vue'))

    expect(outside.sources?.()).toEqual(expect.arrayContaining([join(dir, 'lib/Btn.vue'), join(dir, 'book/Inside.vue')]))
  }, 60_000)

  it('reads such a component again after it changes', async () => {
    const file = join(dir, 'lib/Edited.vue')
    writeFileSync(file, withProp('before'))
    await outside.extract(file)

    writeFileSync(file, withProp('after'))
    outside.update?.(file)
    const doc = await outside.extract(file)

    expect(doc!.props).toEqual([expect.objectContaining({ name: 'after', type: 'string' })])
  }, 60_000)

  it('still starts in a book with no `vue` to find', async () => {
    const bare = await createExtractor({ root: join(dir, 'lib'), options: {} })

    expect(await bare.extract(join(dir, 'lib/Btn.vue'))).toBeDefined()
    bare.dispose()
  }, 60_000)
})

// Outside the repository for the same reason. The tsconfig is the reader's, so `vue` isn't
// mapped for them, and the table says why it can't be read (#1585).
describe('a book with a tsconfig and a component with nothing installed up its tree', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-docgen-tsconfig-')))
  const vue = dirname(createRequire(import.meta.url).resolve('vue/package.json'))
  const options = { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', strict: true, skipLibCheck: true }

  function book(name: string, tsconfig: object) {
    const root = join(dir, name, 'book')
    mkdirSync(join(root, 'node_modules'), { recursive: true })
    mkdirSync(join(dir, name, 'lib'))
    symlinkSync(vue, join(root, 'node_modules/vue'), 'junction')
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: options, ...tsconfig }))
    writeFileSync(join(root, 'only.ts'), 'export {}\n')
    writeFileSync(join(root, 'Inside.vue'), '<template>\n  <button />\n</template>\n')
    writeFileSync(join(dir, name, 'lib/Btn.vue'), '<script setup lang="ts">\ndefineProps<{ label: string }>()\n</script>\n\n<template>\n  <button>{{ label }}</button>\n</template>\n')
    return { root, btn: join(dir, name, 'lib/Btn.vue') }
  }

  async function read(name: string, tsconfig: object, file: (paths: ReturnType<typeof book>) => string = paths => paths.btn) {
    const paths = book(name, tsconfig)
    const extractor = await createExtractor({ root: paths.root, options: {} })
    try {
      return await extractor.extract(file(paths))
    }
    finally {
      extractor.dispose()
    }
  }

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('says `vue` does not resolve when its `include` reaches the component', async () => {
    await expect(read('named', { include: ['.', '../lib'] })).rejects.toThrow(/`vue` doesn't resolve from .*Btn\.vue/)
  }, 60_000)

  it('reads the props once its `paths` maps `vue`', async () => {
    const doc = await read('mapped', { compilerOptions: { ...options, paths: { vue: ['./node_modules/vue'] } }, include: ['.', '../lib'] })

    expect(doc!.props).toEqual([expect.objectContaining({ name: 'label', type: 'string', required: true })])
  }, 60_000)

  it('keeps its message when the component is not in the program', async () => {
    await expect(read('elsewhere', { include: ['only.ts'] })).rejects.toThrow(/is not in the program of/)
  }, 60_000)

  it('leaves a component with nothing to read alone when `vue` resolves', async () => {
    const doc = await read('inside', { include: ['.'] }, paths => join(paths.root, 'Inside.vue'))

    expect(doc).toEqual(expect.objectContaining({ props: [], slots: [], events: [] }))
  }, 60_000)
})
