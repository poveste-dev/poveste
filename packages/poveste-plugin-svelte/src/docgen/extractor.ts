import type { ComponentDoc, DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type { JsxDocgenOptions } from 'poveste/docgen-jsx'
import type ts from 'typescript'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, isAbsolute, join, resolve } from 'pathe'
import { documentProps } from 'poveste/docgen-jsx'
import { svelteDefaults } from './defaults.js'

const TSCONFIGS = ['tsconfig.app.json', 'tsconfig.json']
// A Svelte 5 `Snippet<...>`, and Svelte 4's slot shape as `svelte2tsx` types it.
const SLOT_TYPE = /\bSnippet\b/
// Svelte 5's DOM-style `onclick` as well as a library's `onCheckedChange`.
const EVENT_NAME = /^on[a-z]/i
// Each `.svelte` file is read as its `svelte2tsx` output under this name. Nothing on
// disk carries it, unlike `x.svelte.ts`, which is a rune module a book may have.
const VIRTUAL = '.tsx'

const ownRequire = createRequire(import.meta.url)

function bookRequire(root: string) {
  return createRequire(join(root, 'package.json'))
}

function load<T>(root: string, id: string, why: string): T {
  try {
    return bookRequire(root)(id)
  }
  catch {
    throw new Error(`auto-docs for Svelte components ${why}, and needs \`${id}\` installed in the book`)
  }
}

function isVirtual(file: string) {
  return file.endsWith(`.svelte${VIRTUAL}`) && !file.includes('/node_modules/')
}

function realOf(file: string) {
  return isVirtual(file) ? file.slice(0, -VIRTUAL.length) : file
}

/**
 * Runs in the docgen worker. One language service over the book's tsconfig, in
 * which a `.svelte` file is its `svelte2tsx` output; a probe file names each
 * requested component's `ComponentProps`, which the checker resolves through
 * imported and extended types the way the book's editor does (#501, #1160).
 */
export async function createExtractor(context: DocgenExtractorContext): Promise<DocgenExtractor> {
  const root = context.root
  const options = (context.options ?? {}) as JsxDocgenOptions
  const typescript = load<typeof ts>(root, 'typescript', 'reads their types')
  const { VERSION, parse } = load<typeof import('svelte/compiler')>(root, 'svelte/compiler', 'reads their source')
  const { svelte2tsx } = await import('svelte2tsx')
  const shims = ['svelte-shims-v4.d.ts', 'svelte-jsx-v4.d.ts'].map(file => join(dirname(ownRequire.resolve('svelte2tsx/package.json')), file))

  const tsconfig = TSCONFIGS.map(name => join(root, name)).find(file => existsSync(file))
  const parsed = tsconfig && typescript.getParsedCommandLineOfConfigFile(tsconfig, {}, { ...typescript.sys, onUnRecoverableConfigFileDiagnostic: () => {} })
  const compilerOptions: ts.CompilerOptions = {
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.Bundler,
    target: typescript.ScriptTarget.ESNext,
    strict: true,
    skipLibCheck: true,
    ...parsed ? parsed.options : {},
    // What `svelte2tsx` output needs whatever the book says: it is TSX, and the probe is never emitted.
    jsx: typescript.JsxEmit.Preserve,
    allowJs: true,
    noEmit: true,
  }

  const probe = join(root, '__poveste_docgen__.ts')
  const requested: string[] = []
  const versions = new Map<string, number>()
  const generated = new Map<string, string>()
  let projectVersion = 0

  function bump(file: string) {
    versions.set(file, (versions.get(file) ?? 0) + 1)
    projectVersion++
  }

  function probeText() {
    return requested.map((file, index) =>
      `import C${index} from ${JSON.stringify(file)}\nexport type P${index} = import('svelte').ComponentProps<typeof C${index}>\n`).join('')
  }

  // Whether a component's script is TypeScript. One without `lang="ts"` comes out of
  // `svelte2tsx` typed in JSDoc, which only a JS source file reads.
  const typed = new Map<string, boolean>()

  function tsx(file: string) {
    let code = generated.get(file)
    if (code === undefined) {
      const source = readFileSync(file, 'utf8')
      const isTsFile = /<script\s[^>]*lang=["']ts["']/.test(source)
      typed.set(file, isTsFile)
      code = svelte2tsx(source, { filename: file, isTsFile, mode: 'ts', version: VERSION }).code
      generated.set(file, code)
    }
    return code
  }

  function scriptKind(file: string) {
    if (!isVirtual(file)) {
      return typescript.ScriptKind.Unknown
    }
    tsx(realOf(file))
    return typed.get(realOf(file)) ? typescript.ScriptKind.TSX : typescript.ScriptKind.JSX
  }

  function read(file: string) {
    if (file === probe) {
      return probeText()
    }
    if (isVirtual(file) && existsSync(realOf(file))) {
      return tsx(realOf(file))
    }
    return typescript.sys.readFile(file)
  }

  function exists(file: string) {
    return file === probe || (isVirtual(file) ? existsSync(realOf(file)) : typescript.sys.fileExists(file))
  }

  const moduleHost: ts.ModuleResolutionHost = { ...typescript.sys, fileExists: exists, readFile: read }
  const cache = typescript.createModuleResolutionCache(root, name => name, compilerOptions)

  /**
   * A `.svelte` specifier goes to the virtual file when the book has the component,
   * through the book's own `paths`, and otherwise resolves as TypeScript would: to a
   * package's `.svelte.d.ts`, or to the ambient `*.svelte` module.
   */
  function resolveOne(specifier: string, containingFile: string): ts.ResolvedModuleWithFailedLookupLocations {
    if (specifier.endsWith('.svelte')) {
      const direct = specifier.startsWith('.') || isAbsolute(specifier) ? resolve(dirname(containingFile), specifier) + VIRTUAL : undefined
      // Through `paths` (`$lib/x.svelte`), the mapped location is all that is kept: TypeScript marks
      // that resolution as made with a `.tsx` extension, which the specifier does not have, and the
      // checker then fails an assertion looking for it.
      const target = direct ?? typescript.resolveModuleName(specifier + VIRTUAL, containingFile, compilerOptions, moduleHost, cache).resolvedModule?.resolvedFileName
      if (target && isVirtual(target) && existsSync(realOf(target))) {
        return { resolvedModule: { resolvedFileName: target, extension: typescript.Extension.Tsx, isExternalLibraryImport: false } }
      }
    }
    return typescript.resolveModuleName(specifier, containingFile, compilerOptions, moduleHost, cache)
  }

  const service = typescript.createLanguageService({
    getProjectVersion: () => String(projectVersion),
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => [probe, ...shims],
    getScriptVersion: file => String(versions.get(file) ?? 0),
    getScriptSnapshot(file) {
      const text = read(file)
      return text === undefined ? undefined : typescript.ScriptSnapshot.fromString(text)
    },
    getScriptKind: scriptKind,
    getCurrentDirectory: () => root,
    getDefaultLibFileName: settings => typescript.getDefaultLibFilePath(settings),
    fileExists: exists,
    readFile: read,
    readDirectory: typescript.sys.readDirectory,
    directoryExists: typescript.sys.directoryExists,
    getDirectories: typescript.sys.getDirectories,
    ...typescript.sys.realpath ? { realpath: typescript.sys.realpath } : {},
    resolveModuleNameLiterals: (literals, containingFile) => literals.map(literal => resolveOne(literal.text, containingFile)),
  })

  return {
    extract(file): ComponentDoc {
      let index = requested.indexOf(file)
      if (index === -1) {
        index = requested.push(file) - 1
        bump(probe)
      }
      const program = service.getProgram()
      const alias = program?.getSourceFile(probe)?.statements.find((statement): statement is ts.TypeAliasDeclaration =>
        typescript.isTypeAliasDeclaration(statement) && statement.name.text === `P${index}`)
      if (!program || !alias) {
        throw new Error('TypeScript built no program for the book')
      }
      const checker = program.getTypeChecker()
      const props = checker.getTypeAtLocation(alias.name)
      if (props.flags & typescript.TypeFlags.Any) {
        throw new Error('its props type did not resolve')
      }
      return documentProps(typescript, checker, props, {
        location: alias,
        name: basename(file).replace(/\.svelte$/, ''),
        defaults: svelteDefaults(parse, readFileSync(file, 'utf8')),
        slotType: SLOT_TYPE,
        eventName: EVENT_NAME,
      }, options)
    },
    update(file) {
      if (file.endsWith('.svelte')) {
        generated.delete(file)
        typed.delete(file)
        bump(file + VIRTUAL)
      }
      else {
        bump(file)
      }
    },
    sources: () => service.getProgram()?.getSourceFiles().map(sourceFile => realOf(sourceFile.fileName)).filter(file => file !== probe && !file.includes('/node_modules/')) ?? [],
    dispose: () => service.dispose(),
  }
}
