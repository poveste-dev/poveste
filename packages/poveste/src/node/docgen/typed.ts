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
  const tsconfig = findTsconfig(root)
  return tsconfig === undefined
    ? undefined
    : typescript.getParsedCommandLineOfConfigFile(tsconfig, {}, {
        ...typescript.sys,
        onUnRecoverableConfigFileDiagnostic: () => {},
      })
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

    const signature = checker.getNonNullableType(type).getCallSignatures()[0]
    if ((reading.eventName ?? EVENT_NAME).test(symbol.name) && signature) {
      const payload = signature.getParameters().map(parameter => `${parameter.name}: ${print(checker.getTypeOfSymbol(parameter))}`).join(', ')
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
