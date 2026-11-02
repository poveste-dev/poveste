import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type ts from 'typescript'
import type { PropertyMeta } from 'vue-component-meta'
import type { VueDocgenOptions } from './meta.js'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { bookTsconfig, resolveType } from 'poveste/docgen'
import { readEventDocs } from './events.js'
import { readGeneric } from './generic.js'
import { toComponentDoc } from './meta.js'
import { readSlotProps } from './slots.js'

const SOURCE = /\.(?:vue|[cm]?[jt]sx?)$/

/**
 * Runs in the docgen worker. `vue-component-meta` is imported here rather than at
 * the top, so a book without TypeScript fails this one request, answered with its
 * error, and keeps its runtime props.
 */
export async function createExtractor(context: DocgenExtractorContext): Promise<DocgenExtractor> {
  const { createChecker, createCheckerByJson, TypeMeta } = await import('vue-component-meta')
  const options = (context.options ?? {}) as VueDocgenOptions
  const checkerOptions = { forceUseTs: true, printer: { newLine: 1 } }
  // The copy vue-component-meta loaded, so the syntax kinds match the program it builds.
  const typescript: typeof ts = createRequire(createRequire(import.meta.url).resolve('vue-component-meta'))('typescript')
  const tsconfig = bookTsconfig(typescript, context.root)
  const checker = tsconfig
    ? createChecker(tsconfig, checkerOptions)
    : createCheckerByJson(context.root, { include: ['**/*'], exclude: ['node_modules'] }, checkerOptions)

  // A script file is offered for its default export, which is a component only when it is
  // `defineComponent`'s: a function, a helper or a plain object throws or reads as Unknown.
  function scriptComponent(file: string) {
    try {
      const meta = checker.getComponentMeta(file, 'default')
      return meta.type === TypeMeta.Unknown ? undefined : meta
    }
    catch {
      return undefined
    }
  }

  return {
    extract(file) {
      // vue-component-meta's own message says "not part of the project" and not which one.
      if (tsconfig && file.endsWith('.vue') && !checker.getProgram()?.getSourceFile(file)) {
        throw new Error(`'${file}' is not in the program of ${tsconfig}, the tsconfig auto-docs reads. Add it to that tsconfig's \`include\`.`)
      }
      const meta = file.endsWith('.vue') ? checker.getComponentMeta(file) : scriptComponent(file)
      if (!meta) {
        return undefined
      }
      const program = checker.getProgram()
      // Against the type as the table prints an optional one, without its `undefined`.
      const resolve = (prop: PropertyMeta) => program && resolveType(typescript, program.getTypeChecker(), prop.getTypeObject(), prop.required ? prop.type : prop.type.replace(/ \| undefined$/, ''))
      const doc = toComponentDoc(meta, options, meta.events.length ? readEventDocs(typescript, program, file) : undefined, slot => readSlotProps(typescript, program, slot), resolve)
      const generic = file.endsWith('.vue') ? readGeneric(readFileSync(file, 'utf8')) : undefined
      return generic ? { ...doc, generic } : doc
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
