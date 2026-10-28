import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'
import { bookTsconfig, declaredOnlyInPackages, normalizeDefault } from '../docgen/typed.js'
import { tempDir } from './temp-dir.js'

describe('normalizeDefault', () => {
  it('reads quoting from a tag and from the printer as the same value', () => {
    expect(normalizeDefault('\'md\'')).toBe(normalizeDefault('"md"'))
    expect(normalizeDefault('`3`')).toBe('3')
  })
})

describe('declaredOnlyInPackages', () => {
  it('holds for a prop every declaration of which is installed, and no allowed package declares', () => {
    expect(declaredOnlyInPackages(['/book/node_modules/solid-js/types/jsx.d.ts'], [])).toBe(true)
    expect(declaredOnlyInPackages(['/book/node_modules/.pnpm/reka-ui@2/node_modules/reka-ui/dist/a.d.ts'], ['reka-ui'])).toBe(false)
  })

  it('fails for a prop the book declares, even once, and on Windows paths', () => {
    expect(declaredOnlyInPackages(['/book/node_modules/x/a.d.ts', '/book/src/types.ts'], [])).toBe(false)
    expect(declaredOnlyInPackages(['C:\\book\\node_modules\\x\\a.d.ts'], [])).toBe(true)
  })
})

describe('bookTsconfig', () => {
  let book: ReturnType<typeof tempDir> | undefined
  afterEach(() => book?.remove())

  function write(files: Record<string, unknown>) {
    book = tempDir(join(tmpdir(), 'poveste-tsconfig-'))
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(book.path, file)), { recursive: true })
      writeFileSync(join(book.path, file), typeof content === 'string' ? content : JSON.stringify(content))
    }
    return book.path
  }

  const settings = { compilerOptions: { strict: true } }

  // Nuxt 4's root, as `nuxi init` writes it (#1535).
  it('follows a references-only root to the referenced project with the book\'s sources', () => {
    const root = write({
      'tsconfig.json': { files: [], references: [{ path: './.nuxt/tsconfig.node.json' }, { path: './.nuxt/tsconfig.app.json' }] },
      '.nuxt/tsconfig.node.json': { ...settings, include: ['../nuxt.config.ts'] },
      '.nuxt/tsconfig.app.json': { ...settings, include: ['../app/**/*'] },
      'nuxt.config.ts': 'export default {}',
      'app/app.vue': '<template><Button /></template>',
      'app/components/Button.vue': '<template><button /></template>',
    })

    expect(bookTsconfig(ts, root)).toBe(join(root, '.nuxt/tsconfig.app.json'))
  })

  it('keeps the earlier reference when two hold as many sources', () => {
    const root = write({
      'tsconfig.json': { files: [], references: [{ path: './tsconfig.web.json' }, { path: './tsconfig.node.json' }] },
      'tsconfig.web.json': { ...settings, include: ['src/**/*'] },
      'tsconfig.node.json': { ...settings, include: ['vite.config.ts'] },
      'src/main.ts': 'export {}',
      'vite.config.ts': 'export default {}',
    })

    expect(bookTsconfig(ts, root)).toBe(join(root, 'tsconfig.web.json'))
  })

  it('reads a root tsconfig that includes files itself, references or not', () => {
    const root = write({
      'tsconfig.json': { ...settings, include: ['src/**/*'], references: [{ path: './tsconfig.node.json' }] },
      'tsconfig.node.json': { ...settings, include: ['*.config.ts', 'src/**/*'] },
      'src/main.ts': 'export {}',
    })

    expect(bookTsconfig(ts, root)).toBe(join(root, 'tsconfig.json'))
  })

  // `.nuxt` before `nuxi prepare` has run.
  it('reads the root when what it references is not there', () => {
    const root = write({ 'tsconfig.json': { files: [], references: [{ path: './.nuxt/tsconfig.app.json' }] } })

    expect(bookTsconfig(ts, root)).toBe(join(root, 'tsconfig.json'))
  })
})
