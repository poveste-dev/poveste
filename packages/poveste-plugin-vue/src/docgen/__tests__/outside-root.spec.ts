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

  it('lists events in the same order with the mapping as without it', async () => {
    copyFileSync(join(dir, 'book/Inside.vue'), join(dir, 'lib/Outside.vue'))

    const doc = await outside.extract(join(dir, 'lib/Outside.vue'))

    expect(doc!.events?.map(event => event.name)).toEqual(['update:value', 'press', 'close'])
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
