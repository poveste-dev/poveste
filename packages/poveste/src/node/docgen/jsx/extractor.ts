import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type ts from 'typescript'
import type { DocgenOptions } from '../typed.js'
import type { JsxDialect } from './walk.js'
import { existsSync } from 'node:fs'
import { ambientFiles, loadFromBook, readTsconfig } from '../typed.js'
import { documentStory } from './walk.js'

function compilerOptions(typescript: typeof ts, parsed: ts.ParsedCommandLine | undefined, dialect: JsxDialect): ts.CompilerOptions {
  return {
    ...parsed
      ? parsed.options
      : {
          jsx: typescript.JsxEmit.Preserve,
          jsxImportSource: dialect.jsxImportSource,
          module: typescript.ModuleKind.ESNext,
          moduleResolution: typescript.ModuleResolutionKind.Bundler,
          target: typescript.ScriptTarget.ESNext,
          strict: true,
          skipLibCheck: true,
        },
    // A `.story.jsx` is read whatever the book's tsconfig says, and nothing is emitted.
    allowJs: true,
    noEmit: true,
  }
}

/**
 * The JSX frameworks' extractor, run in the docgen worker: one language service
 * over the book's tsconfig, read through a dialect. A plugin's extractor module
 * is this with its dialect bound.
 */
export function createJsxExtractor(context: DocgenExtractorContext, dialect: JsxDialect): DocgenExtractor {
  const typescript = loadFromBook<typeof ts>(context.root, 'typescript', 'reads JSX components\' types')
  const options = (context.options ?? {}) as DocgenOptions
  const parsed = readTsconfig(typescript, context.root)
  const settings = compilerOptions(typescript, parsed, dialect)
  // The requested stories and the book's declaration files, not every source it includes:
  // the program grows with the components asked for, not with the book.
  const files = new Set(ambientFiles(parsed))
  const versions = new Map<string, number>()
  let projectVersion = 0

  const service = typescript.createLanguageService({
    getProjectVersion: () => String(projectVersion),
    getCompilationSettings: () => settings,
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
