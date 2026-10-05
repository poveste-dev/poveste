import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { tree } from '../checks/support/fixture-tree.ts'
import { buildBundles, packageDirOf, renderNotices, thirdPartyNotices } from './third-party-notices.ts'

const MIT_TEXT = 'MIT License\n\nCopyright (c) Someone'

// A package root with one installed dependency.
function project(licence = 'MIT', withLicenceFile = true) {
  return tree({
    'package.json': JSON.stringify({ name: '@fixture/lib' }),
    'node_modules/inlined/package.json': JSON.stringify({ name: 'inlined', version: '1.2.3', license: licence }),
    ...withLicenceFile ? { 'node_modules/inlined/LICENSE': MIT_TEXT } : {},
    'node_modules/inlined/index.js': 'export const x = 1',
  })
}

// Runs the plugin's hooks over a bundle as the bundler would hand it over.
function build(root: string, modules: Record<string, number>) {
  const plugin = thirdPartyNotices({ packageName: '@fixture/lib' }) as any
  plugin.configResolved({ root })
  const errors: string[] = []
  const context = {
    error: (message: string) => {
      errors.push(message)
      throw new Error(message)
    },
  }
  const bundle = { 'index.js': { type: 'chunk', modules: Object.fromEntries(Object.entries(modules).map(([id, renderedLength]) => [id, { renderedLength }])) } }
  try {
    plugin.generateBundle.call(context, {}, bundle)
    plugin.writeBundle()
  }
  catch {}
  return { errors, notices: () => readFileSync(join(root, 'dist', 'THIRD_PARTY_NOTICES.md'), 'utf8') }
}

describe('packageDirOf', () => {
  it('finds the package a module id belongs to, scoped or not', () => {
    expect(packageDirOf('/p/node_modules/.pnpm/a@1/node_modules/@scope/pkg/dist/x.js?v=1')).toBe('/p/node_modules/.pnpm/a@1/node_modules/@scope/pkg')
    expect(packageDirOf('/p/node_modules/pkg/index.js')).toBe('/p/node_modules/pkg')
  })

  it('is undefined for the package\'s own source', () => {
    expect(packageDirOf('/p/src/index.ts')).toBeUndefined()
  })
})

describe('thirdPartyNotices', () => {
  it('lists what the bundle rendered, with its licence text', () => {
    const root = project()
    const { notices } = build(root, { [join(root, 'node_modules/inlined/index.js')]: 20, [join(root, 'src/index.ts')]: 40 })

    expect(notices()).toContain('## inlined@1.2.3\n\nLicence: MIT\n\n```\nMIT License\n\nCopyright (c) Someone\n```')
  })

  it('leaves out a module tree-shaking emptied', () => {
    const root = project()
    const { notices } = build(root, { [join(root, 'node_modules/inlined/index.js')]: 0 })

    expect(notices()).toBe('# Third-party notices\n\n@fixture/lib bundles no third-party code into its `dist`.\n')
  })

  it('fails the build on a bundled licence outside the allow-list', () => {
    const root = project('GPL-3.0-only')
    const { errors } = build(root, { [join(root, 'node_modules/inlined/index.js')]: 20 })

    expect(errors[0]).toContain('inlined@1.2.3 is licensed GPL-3.0-only, which is not in the allow-list')
  })

  it('fails the build on a bundled package that ships no licence file', () => {
    const root = project('MIT', false)
    const { errors } = build(root, { [join(root, 'node_modules/inlined/index.js')]: 20 })

    expect(errors[0]).toContain('inlined@1.2.3 ships no licence file')
  })
})

describe('renderNotices', () => {
  it('carries an Apache NOTICE beside the licence', () => {
    const notices = renderNotices('@fixture/lib', [{ name: 'a', version: '1.0.0', licence: 'Apache-2.0', licenceText: 'Apache text', noticeText: 'Copyright A' }])

    expect(notices).toContain('NOTICE:\n\n```\nCopyright A\n```')
  })
})

describe('buildBundles', () => {
  it('tells a bundling build from a compile', () => {
    expect(buildBundles({ scripts: { build: 'rimraf dist && vite build && tsc -d' } })).toBe(true)
    expect(buildBundles({ scripts: { build: 'rimraf dist && tsc -d' } })).toBe(false)
  })
})
