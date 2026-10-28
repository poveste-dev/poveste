import type { ComponentDoc, DocEvent, DocProp, DocSlot, DocTag } from '@poveste/shared'
import type ts from 'typescript'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'

/*
 * What every extractor that reads props through a TypeScript checker shares: Vue's
 * through `vue-component-meta`, the JSX walker, and Svelte through `svelte2tsx`. The
 * rules here are #159's, kept in one place so the frameworks' tables cannot drift.
 */

/** What a plugin and the book pass an extractor, through `docgen.options` and `autoDocs`. */
export interface DocgenOptions {
  /** Packages whose props count although they are declared under `node_modules`. */
  allow?: string[]
  /** Component files to leave out, matched as substrings of the path. */
  exclude?: string[]
}

export const HIDDEN_TAGS = ['internal', 'private']
// Aliases: bits-ui mixes them about 50/50, reka-ui and nuxt/ui write `@defaultValue`.
export const DEFAULT_TAGS = ['default', 'defaultValue']
const EVENT_NAME = /^on[A-Z]/

// `tsconfig.app.json` first: Vite's templates split the app's settings into it
// and leave `tsconfig.json` holding only references, which type nothing.
const TSCONFIGS = ['tsconfig.app.json', 'tsconfig.json']

export function findTsconfig(root: string) {
  return TSCONFIGS.map(name => join(root, name)).find(file => existsSync(file))
}

/**
 * The tsconfig the book's components are typed by. A root one holding only
 * `references`, as Nuxt 4's does, types nothing, and every component read through
 * it was "not part of the project" (#1535). Its referenced project with the most
 * of the book's sources is read instead: the app's, not the one for its config files.
 */
export function bookTsconfig(typescript: typeof ts, root: string): string | undefined {
  const tsconfig = findTsconfig(root)
  return tsconfig === undefined ? undefined : projectOf(typescript, tsconfig, new Set()).file
}

// So `include: ['../app/**/*']` lists the components, not only the `.ts` beside them.
function componentExtensions(typescript: typeof ts): ts.FileExtensionInfo[] {
  return ['.vue', '.svelte'].map(extension => ({ extension, isMixedContent: true, scriptKind: typescript.ScriptKind.Deferred }))
}

function parse(typescript: typeof ts, file: string) {
  return typescript.getParsedCommandLineOfConfigFile(file, {}, {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  }, undefined, undefined, componentExtensions(typescript))
}

function projectOf(typescript: typeof ts, file: string, seen: Set<string>): { file: string, sources: number } {
  seen.add(file)
  const parsed = parse(typescript, file)
  const sources = parsed?.fileNames.filter(name => !name.endsWith('.d.ts') && !name.includes('/node_modules/')).length ?? 0
  const references = parsed?.fileNames.length ? [] : parsed?.projectReferences ?? []
  let best = { file, sources }
  for (const reference of references) {
    const referenced = typescript.resolveProjectReferencePath(reference)
    if (!seen.has(referenced) && existsSync(referenced)) {
      const project = projectOf(typescript, referenced, seen)
      // Ties keep the earlier reference, and Nuxt and Vite both list the app's first.
      if (project.sources > best.sources) {
        best = project
      }
    }
  }
  return best
}

/** A package as the book resolves it, so types are read as its editor reads them. */
export function loadFromBook<T>(root: string, id: string, why: string): T {
  try {
    return createRequire(join(root, 'package.json'))(id)
  }
  catch {
    throw new Error(`auto-docs ${why}, and needs \`${id}\` installed in the book`)
  }
}

/** The book's tsconfig, parsed; nothing when it has none. */
export function readTsconfig(typescript: typeof ts, root: string): ts.ParsedCommandLine | undefined {
  const tsconfig = bookTsconfig(typescript, root)
  return tsconfig === undefined ? undefined : parse(typescript, tsconfig)
}

/**
 * The declaration files a tsconfig includes: `app.d.ts`, `env.d.ts`, globals. A program
 * rooted at the requested components alone would not see them, and the book's other
 * sources it need not build.
 */
export function ambientFiles(parsed: ts.ParsedCommandLine | undefined) {
  return parsed?.fileNames.filter(file => file.endsWith('.d.ts')) ?? []
}

/** A default as written, without the quoting a tag or the printer added. */
export function normalizeDefault(value: string) {
  return value.trim().replace(/^`(.*)`$/s, '$1').replace(/^'(.*)'$/s, '"$1"')
}

/** Declared only in installed packages none of which is allowed: an inherited attribute. */
export function declaredOnlyInPackages(files: string[], allow: string[]) {
  const paths = files.map(file => file.replaceAll('\\', '/'))
  return paths.length > 0 && paths.every(file =>
    file.includes('/node_modules/') && !allow.some(pkg => file.includes(`/node_modules/${pkg}/`)))
}

/** How to read one component's props type, beyond the type itself. */
export interface PropsReading {
  /** Where types are printed from, so aliases in scope there are kept. */
  location: ts.Node
  name?: string
  /** Code defaults by prop name, as written. */
  defaults: Map<string, string>
  /** A prop whose printed type matches is a slot. */
  slotType: RegExp
  /** A callable prop whose name matches is an event. JSX's `onClick` by default; Svelte 5 also writes `onclick`. */
  eventName?: RegExp
  /**
   * Types that give a component `children` it renders, such as Solid's `ParentProps`.
   * `children` inherited from one of them is a slot; inherited from anything else, the
   * HTML attributes a component extends, it is filtered like any other attribute.
   */
  childrenFrom?: string[]
  /** The component's own code takes `children`, as a Svelte `$props()` destructuring shows, wherever it is declared. */
  takesChildren?: boolean
}

function tagsOf(typescript: typeof ts, symbol: ts.Symbol, checker: ts.TypeChecker): DocTag[] {
  return symbol.getJsDocTags(checker).map(tag => tag.text === undefined
    ? { name: tag.name }
    : { name: tag.name, text: typescript.displayPartsToString(tag.text) })
}

function declaredIn(typescript: typeof ts, symbol: ts.Symbol, names: string[]) {
  return (symbol.getDeclarations() ?? []).some((declaration) => {
    let node: ts.Node | undefined = declaration
    while (node && !typescript.isInterfaceDeclaration(node) && !typescript.isTypeAliasDeclaration(node)) {
      node = node.parent
    }
    return node !== undefined && names.includes(node.name.text)
  })
}

/**
 * An event's parameters as `name: type`. A handler typed as a union, as props that
 * are a union over a discriminant give each member its own, has one call signature
 * that TypeScript merges by intersecting the parameters: bits-ui's Accordion printed
 * `value: string & string[]`, which no value meets. So each member's are read and
 * joined, `value: string | string[]` (#501).
 */
function payloadOf(checker: ts.TypeChecker, handler: ts.Type, print: (type: ts.Type) => string): string {
  const members = handler.isUnion() ? handler.types : [handler]
  const signatures = members.flatMap(member => member.getCallSignatures().slice(0, 1))
  const count = Math.max(0, ...signatures.map(signature => signature.getParameters().length))
  return Array.from({ length: count }, (_, index) => {
    const parameters = signatures.flatMap(signature => signature.getParameters().slice(index, index + 1))
    const types = [...new Set(parameters.map(parameter => print(checker.getTypeOfSymbol(parameter))))]
    return `${parameters[0]!.name}: ${types.join(' | ')}`
  }).join(', ')
}

/**
 * A props type as a docs table: filtered, tagged, split into props, slots and
 * events, defaults reconciled.
 */
export function documentProps(typescript: typeof ts, checker: ts.TypeChecker, props: ts.Type, reading: PropsReading, options: DocgenOptions = {}): ComponentDoc {
  const allow = options.allow ?? []
  const { location, defaults, slotType } = reading
  const print = (type: ts.Type) => checker.typeToString(type, location, typescript.TypeFormatFlags.NoTruncation | typescript.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
  const doc: ComponentDoc = { ...reading.name ? { name: reading.name } : {}, props: [], slots: [], events: [] }

  for (const symbol of checker.getPropertiesOfType(checker.getApparentType(props))) {
    const tags = tagsOf(typescript, symbol, checker)
    const files = (symbol.getDeclarations() ?? []).map(declaration => declaration.getSourceFile().fileName)
    const parentChildren = symbol.name === 'children' && (reading.takesChildren || declaredIn(typescript, symbol, reading.childrenFrom ?? []))
    if (tags.some(tag => HIDDEN_TAGS.includes(tag.name)) || (!parentChildren && declaredOnlyInPackages(files, allow))) {
      continue
    }
    const required = !(symbol.flags & typescript.SymbolFlags.Optional)
    const type = checker.getTypeOfSymbolAtLocation(symbol, location)
    // Optional members print with the `| undefined` strict mode adds; the table says optional already.
    const printed = required ? print(type) : print(type).replace(/ \| undefined$/, '')
    const description = typescript.displayPartsToString(symbol.getDocumentationComment(checker)) || undefined
    const member = { name: symbol.name, ...description ? { description } : {}, tags }

    const handler = checker.getNonNullableType(type)
    if ((reading.eventName ?? EVENT_NAME).test(symbol.name) && handler.getCallSignatures().length) {
      const payload = payloadOf(checker, handler, print)
      doc.events.push({ ...member, ...payload ? { type: payload } : {} } satisfies DocEvent)
      continue
    }
    if (symbol.name === 'children' || slotType.test(printed)) {
      doc.slots.push({ ...member, type: printed } satisfies DocSlot)
      continue
    }

    // Normalised as Vue's printer writes it, so a default reads the same in every framework's table.
    const written = defaults.get(symbol.name)
    const code = written === undefined ? undefined : normalizeDefault(written)
    const defaultTag = tags.find(tag => DEFAULT_TAGS.includes(tag.name))?.text
    doc.props.push({
      ...member,
      type: printed,
      required,
      ...code !== undefined ? { default: code } : {},
      ...defaultTag !== undefined ? { defaultTag } : {},
      // The code's default is what runs, so it is the one shown; the flag is for the reader.
      ...code !== undefined && defaultTag !== undefined && code !== normalizeDefault(defaultTag)
        ? { defaultConflict: true }
        : {},
    } satisfies DocProp)
  }
  return doc
}
