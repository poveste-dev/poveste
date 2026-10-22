import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type ts from 'typescript'
import type { VueDocgenOptions } from './meta.js'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { findTsconfig } from 'poveste/docgen'
import { readEventDocs } from './events.js'
import { toComponentDoc } from './meta.js'

const SOURCE = /\.(?:vue|[cm]?[jt]sx?)$/

/**
 * Runs in the docgen worker. `vue-component-meta` is imported here rather than at
 * the top, so a book without TypeScript fails this one request, answered with its
 * error, and keeps its runtime props.
 */
export async function createExtractor(context: DocgenExtractorContext): Promise<DocgenExtractor> {
  const { createChecker, createCheckerByJson } = await import('vue-component-meta')
  const options = (context.options ?? {}) as VueDocgenOptions
  const checkerOptions = { forceUseTs: true, printer: { newLine: 1 } }
  const tsconfig = findTsconfig(context.root)
  // The copy vue-component-meta loaded, so the syntax kinds match the program it builds.
  const typescript: typeof ts = createRequire(createRequire(import.meta.url).resolve('vue-component-meta'))('typescript')
  const checker = tsconfig
    ? createChecker(tsconfig, checkerOptions)
    : createCheckerByJson(context.root, { include: ['**/*'], exclude: ['node_modules'] }, checkerOptions)

  return {
    extract(file) {
      const meta = checker.getComponentMeta(file)
      return toComponentDoc(meta, options, meta.events.length ? readEventDocs(typescript, checker.getProgram(), file) : undefined)
    },
    update(file) {
      if (!SOURCE.test(file)) {
        return
      }
      if (existsSync(file)) {
        checker.updateFile(file, readFileSync(file, 'utf8'))
      }
      else {
        checker.deleteFile(file)
      }
    },
    sources: () => checker.getProgram()?.getSourceFiles().map(sourceFile => sourceFile.fileName).filter(file => !file.includes('/node_modules/')) ?? [],
    // The program is released with the checker; this drops what it cached.
    dispose: () => checker.clearCache(),
  }
}
