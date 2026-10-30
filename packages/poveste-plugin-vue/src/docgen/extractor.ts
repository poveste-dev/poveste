import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type ts from 'typescript'
import type { createChecker } from 'vue-component-meta'
import type { VueDocgenOptions } from './meta.js'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'pathe'
import { bookTsconfig, bundledTypescript } from 'poveste/docgen'
import { readEventDocs } from './events.js'
import { readGeneric } from './generic.js'
import { toComponentDoc } from './meta.js'
import { readSlotProps } from './slots.js'

type VueChecker = ReturnType<typeof createChecker>

const SOURCE = /\.(?:vue|[cm]?[jt]sx?)$/

/**
 * Runs in the docgen worker, reading the book with Poveste's own TypeScript 6
 * whatever the book has (#1464). `vue-component-meta`'s entry requires whichever
 * `typescript` it finds beside it, which in a book on TypeScript 7 is the book's, so
 * its checker is built here from `createCheckerBase`, which takes the copy to use.
 */
export async function createExtractor(context: DocgenExtractorContext): Promise<DocgenExtractor> {
  const typescript = bundledTypescript()
  const meta = createRequire(import.meta.url).resolve('vue-component-meta')
  const { createCheckerBase } = await import(pathToFileURL(join(dirname(meta), 'lib/checker.js')).href)
  const { TypeMeta } = await import(pathToFileURL(join(dirname(meta), 'lib/types.js')).href)
  const core = createRequire(meta)('@vue/language-core')
  const options = (context.options ?? {}) as VueDocgenOptions
  const checkerOptions = { forceUseTs: true, printer: { newLine: 1 } }
  const tsconfig = bookTsconfig(typescript, context.root)
  // `vue-component-meta`'s own `createChecker` and `createCheckerByJson`, with this copy.
  const fileNames = (commandLine: { vueOptions: unknown }, read: (extensions: ts.FileExtensionInfo[]) => string[]) =>
    read(core.getAllExtensions(commandLine.vueOptions).map((extension: string) => ({ extension: extension.slice(1), isMixedContent: true, scriptKind: typescript.ScriptKind.Deferred })))
  const checker: VueChecker = tsconfig
    ? createCheckerBase(typescript, () => {
        const commandLine = core.createParsedCommandLine(typescript, typescript.sys, tsconfig)
        return [commandLine, fileNames(commandLine, extensions => typescript.parseJsonSourceFileConfigFileContent(typescript.readJsonConfigFile(tsconfig, typescript.sys.readFile), typescript.sys, dirname(tsconfig), {}, tsconfig, undefined, extensions).fileNames)]
      }, checkerOptions, dirname(tsconfig))
    : createCheckerBase(typescript, () => {
        const json = { include: ['**/*'], exclude: ['node_modules'] }
        const commandLine = core.createParsedCommandLineByJson(typescript, typescript.sys, context.root, json)
        return [commandLine, fileNames(commandLine, extensions => typescript.parseJsonConfigFileContent(json, typescript.sys, context.root, {}, undefined, undefined, extensions).fileNames)]
      }, checkerOptions, context.root)

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
      const doc = toComponentDoc(meta, options, meta.events.length ? readEventDocs(typescript, checker.getProgram(), file) : undefined, slot => readSlotProps(typescript, checker.getProgram(), slot))
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
