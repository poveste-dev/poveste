import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type ts from 'typescript'
import type { JsxDialect, JsxDocgenOptions } from './walk.js'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'
import { documentStory } from './walk.js'

// `tsconfig.app.json` first: Vite's templates split the app's settings into it
// and leave `tsconfig.json` holding only references, which type nothing.
const TSCONFIGS = ['tsconfig.app.json', 'tsconfig.json']

/** The book's own compiler, so the types are read as its editor reads them. */
function loadTypescript(root: string): typeof ts {
  try {
    return createRequire(join(root, 'package.json'))('typescript')
  }
  catch {
    throw new Error('auto-docs for JSX components reads their types, and needs `typescript` installed in the book')
  }
}

function compilerSettings(typescript: typeof ts, root: string, dialect: JsxDialect) {
  const tsconfig = TSCONFIGS.map(name => join(root, name)).find(file => existsSync(file))
  const parsed = tsconfig && typescript.getParsedCommandLineOfConfigFile(tsconfig, {}, {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  })
  if (parsed) {
    return { options: parsed.options, fileNames: parsed.fileNames }
  }
  return {
    options: {
      jsx: typescript.JsxEmit.Preserve,
      jsxImportSource: dialect.jsxImportSource,
      module: typescript.ModuleKind.ESNext,
      moduleResolution: typescript.ModuleResolutionKind.Bundler,
      target: typescript.ScriptTarget.ESNext,
      strict: true,
      allowJs: true,
      skipLibCheck: true,
    } satisfies ts.CompilerOptions,
    fileNames: [],
  }
}

/**
 * The JSX frameworks' extractor, run in the docgen worker: one language service
 * over the book's tsconfig, read through a dialect. A plugin's extractor module
 * is this with its dialect bound.
 */
export function createJsxExtractor(context: DocgenExtractorContext, dialect: JsxDialect): DocgenExtractor {
  const typescript = loadTypescript(context.root)
  const options = (context.options ?? {}) as JsxDocgenOptions
  const settings = compilerSettings(typescript, context.root, dialect)
  const files = new Set(settings.fileNames)
  const versions = new Map<string, number>()
  let projectVersion = 0

  const service = typescript.createLanguageService({
    getProjectVersion: () => String(projectVersion),
    getCompilationSettings: () => settings.options,
    getScriptFileNames: () => [...files],
    getScriptVersion: file => String(versions.get(file) ?? 0),
    getScriptSnapshot(file) {
      const text = typescript.sys.readFile(file)
      return text === undefined ? undefined : typescript.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => context.root,
    getDefaultLibFileName: compilerOptions => typescript.getDefaultLibFilePath(compilerOptions),
    fileExists: typescript.sys.fileExists,
    readFile: typescript.sys.readFile,
    readDirectory: typescript.sys.readDirectory,
    directoryExists: typescript.sys.directoryExists,
    getDirectories: typescript.sys.getDirectories,
  })

  function program() {
    const current = service.getProgram()
    if (!current) {
      throw new Error('TypeScript built no program for the book')
    }
    return current
  }

  return {
    extract(file) {
      if (!files.has(file)) {
        files.add(file)
        projectVersion++
      }
      return documentStory(typescript, program(), file, dialect, options)
    },
    update(file) {
      if (!existsSync(file)) {
        files.delete(file)
      }
      versions.set(file, (versions.get(file) ?? 0) + 1)
      projectVersion++
    },
    sources: () => service.getProgram()?.getSourceFiles().map(sourceFile => sourceFile.fileName).filter(file => !file.includes('/node_modules/')) ?? [],
    dispose: () => service.dispose(),
  }
}
