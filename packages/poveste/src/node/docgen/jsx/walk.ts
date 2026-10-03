import type { ComponentDoc, DocEvent, DocProp, DocSlot, DocTag } from '@poveste/shared'
import type ts from 'typescript'

/** What differs between JSX frameworks, as data, so Solid and React share one walker (#1110, #1161). */
export interface JsxDialect {
  /** Where the compiler finds the JSX types when the book has no tsconfig: `solid-js`, `react`. */
  jsxImportSource: string
  /**
   * Type aliases whose first type argument is the props, read when a component's
   * type has no call signature whose first parameter says it: `Component<P>`.
   */
  componentTypes: string[]
  /** Calls that merge an object of defaults into the props parameter: `mergeProps`. */
  defaultCalls: string[]
  /** A prop whose printed type matches is a slot: `JSX.Element`. */
  slotType: RegExp
}

export interface JsxDocgenOptions {
  /** Packages whose props count although they are declared under `node_modules`. */
  allow?: string[]
}

const HIDDEN_TAGS = ['internal', 'private']
const DEFAULT_TAGS = ['default', 'defaultValue']
const EVENT_NAME = /^on[A-Z]/

/** A default as written, without the quoting a tag or the printer added. */
export function normalizeDefault(value: string) {
  return value.trim().replace(/^`(.*)`$/s, '$1').replace(/^'(.*)'$/s, '"$1"')
}

/**
 * The component a story file's default export names in its `component` field,
 * documented from the type of its first parameter. Nothing when the story names none.
 */
export function documentStory(typescript: typeof ts, program: ts.Program, file: string, dialect: JsxDialect, options: JsxDocgenOptions = {}): ComponentDoc | undefined {
  const sourceFile = program.getSourceFile(file)
  if (!sourceFile) {
    return undefined
  }
  const checker = program.getTypeChecker()
  const component = componentField(typescript, checker, sourceFile)
  if (!component) {
    return undefined
  }
  const type = checker.getTypeAtLocation(component)
  const props = propsType(typescript, checker, type, dialect)
  if (!props) {
    throw new Error(`\`${component.getText()}\` has no props type to read`)
  }
  return toComponentDoc(typescript, checker, component, props, codeDefaults(typescript, checker, component, dialect), dialect, options)
}

function unwrap(typescript: typeof ts, checker: ts.TypeChecker, node: ts.Expression): ts.Expression {
  if (typescript.isParenthesizedExpression(node) || typescript.isAsExpression(node) || typescript.isSatisfiesExpression(node) || typescript.isNonNullExpression(node)) {
    return unwrap(typescript, checker, node.expression)
  }
  // `defineStory({ ... })`
  if (typescript.isCallExpression(node)) {
    const options = node.arguments.find(argument => typescript.isObjectLiteralExpression(argument))
    return options ?? node
  }
  // `const story = defineStory(...); export default story`
  if (typescript.isIdentifier(node)) {
    const declaration = resolve(typescript, checker, node)?.valueDeclaration
    if (declaration && typescript.isVariableDeclaration(declaration) && declaration.initializer) {
      return unwrap(typescript, checker, declaration.initializer)
    }
  }
  return node
}

function resolve(typescript: typeof ts, checker: ts.TypeChecker, node: ts.Node) {
  const symbol = checker.getSymbolAtLocation(node)
  return symbol && symbol.flags & typescript.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

function componentField(typescript: typeof ts, checker: ts.TypeChecker, sourceFile: ts.SourceFile): ts.Expression | undefined {
  const exported = sourceFile.statements.find((statement): statement is ts.ExportAssignment =>
    typescript.isExportAssignment(statement) && !statement.isExportEquals)
  if (!exported) {
    return undefined
  }
  const story = unwrap(typescript, checker, exported.expression)
  if (!typescript.isObjectLiteralExpression(story)) {
    return undefined
  }
  for (const property of story.properties) {
    if (property.name && typescript.isIdentifier(property.name) && property.name.text === 'component') {
      if (typescript.isPropertyAssignment(property)) {
        return property.initializer
      }
      if (typescript.isShorthandPropertyAssignment(property)) {
        return property.name
      }
    }
  }
  return undefined
}

function propsType(typescript: typeof ts, checker: ts.TypeChecker, type: ts.Type, dialect: JsxDialect): ts.Type | undefined {
  for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
    const parameter = signature.getParameters()[0]
    if (parameter) {
      const props = checker.getTypeOfSymbol(parameter)
      if (!(props.flags & (typescript.TypeFlags.Any | typescript.TypeFlags.Unknown))) {
        return props
      }
    }
  }
  if (type.aliasSymbol && dialect.componentTypes.includes(type.aliasSymbol.name)) {
    return type.aliasTypeArguments?.[0]
  }
  return undefined
}

/** The function a component's value is declared as, through imports and wrappers such as `memo(...)`. */
function implementation(typescript: typeof ts, checker: ts.TypeChecker, component: ts.Expression): ts.FunctionLikeDeclaration | undefined {
  const symbol = resolve(typescript, checker, component)
  let node: ts.Node | undefined = symbol?.valueDeclaration
  if (node && typescript.isVariableDeclaration(node)) {
    node = node.initializer
  }
  while (node && typescript.isCallExpression(node)) {
    node = node.arguments.find(argument => typescript.isArrowFunction(argument) || typescript.isFunctionExpression(argument))
  }
  if (node && (typescript.isFunctionDeclaration(node) || typescript.isArrowFunction(node) || typescript.isFunctionExpression(node))) {
    return node
  }
  return undefined
}

function propertyName(typescript: typeof ts, name: ts.PropertyName | ts.BindingName) {
  return typescript.isIdentifier(name) || typescript.isStringLiteral(name) ? name.text : undefined
}

/** An object literal through `as const` and the like. */
function literal(typescript: typeof ts, node: ts.Expression): ts.ObjectLiteralExpression | undefined {
  if (typescript.isParenthesizedExpression(node) || typescript.isAsExpression(node) || typescript.isSatisfiesExpression(node)) {
    return literal(typescript, node.expression)
  }
  return typescript.isObjectLiteralExpression(node) ? node : undefined
}

/**
 * Defaults the component's own code applies: object literals merged into the
 * props parameter by a dialect's call, else defaults in a destructured parameter.
 */
function codeDefaults(typescript: typeof ts, checker: ts.TypeChecker, component: ts.Expression, dialect: JsxDialect): Map<string, string> {
  const defaults = new Map<string, string>()
  const declaration = implementation(typescript, checker, component)
  const parameter = declaration?.parameters[0]
  if (!declaration || !parameter) {
    return defaults
  }
  if (typescript.isObjectBindingPattern(parameter.name)) {
    for (const element of parameter.name.elements) {
      const name = propertyName(typescript, element.propertyName ?? element.name)
      if (name && element.initializer) {
        defaults.set(name, element.initializer.getText())
      }
    }
    return defaults
  }
  if (!typescript.isIdentifier(parameter.name)) {
    return defaults
  }
  const props = parameter.name.text
  function visit(node: ts.Node) {
    if (typescript.isCallExpression(node)) {
      const callee = typescript.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.getText()
      const at = node.arguments.findIndex(argument => typescript.isIdentifier(argument) && argument.text === props)
      if (dialect.defaultCalls.includes(callee) && at > 0) {
        // Only objects before `props` are defaults; one after it overrides what was passed. Later ones win, as at runtime.
        for (const argument of node.arguments.slice(0, at).map(argument => literal(typescript, argument))) {
          if (!argument) {
            continue
          }
          for (const property of argument.properties) {
            const name = property.name && propertyName(typescript, property.name)
            if (name && typescript.isPropertyAssignment(property)) {
              defaults.set(name, property.initializer.getText())
            }
            else if (name && typescript.isShorthandPropertyAssignment(property)) {
              defaults.set(name, name)
            }
          }
        }
      }
    }
    typescript.forEachChild(node, visit)
  }
  if (declaration.body) {
    visit(declaration.body)
  }
  return defaults
}

function tagsOf(typescript: typeof ts, symbol: ts.Symbol, checker: ts.TypeChecker): DocTag[] {
  return symbol.getJsDocTags(checker).map(tag => tag.text === undefined
    ? { name: tag.name }
    : { name: tag.name, text: typescript.displayPartsToString(tag.text) })
}

/** Declared only in installed packages none of which is allowed: an inherited attribute. */
function isInherited(symbol: ts.Symbol, allow: string[]) {
  const files = (symbol.getDeclarations() ?? []).map(declaration => declaration.getSourceFile().fileName.replaceAll('\\', '/'))
  return files.length > 0 && files.every(file =>
    file.includes('/node_modules/') && !allow.some(pkg => file.includes(`/node_modules/${pkg}/`)))
}

function toComponentDoc(
  typescript: typeof ts,
  checker: ts.TypeChecker,
  component: ts.Expression,
  props: ts.Type,
  defaults: Map<string, string>,
  dialect: JsxDialect,
  options: JsxDocgenOptions,
): ComponentDoc {
  const allow = options.allow ?? []
  const print = (type: ts.Type) => checker.typeToString(type, component, typescript.TypeFormatFlags.NoTruncation | typescript.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
  const doc: ComponentDoc = { name: component.getText(), props: [], slots: [], events: [] }

  for (const symbol of checker.getPropertiesOfType(checker.getApparentType(props))) {
    const tags = tagsOf(typescript, symbol, checker)
    // `children` is declared by the framework (`ParentProps`, the JSX attributes) and is still the component's main slot.
    if (tags.some(tag => HIDDEN_TAGS.includes(tag.name)) || (symbol.name !== 'children' && isInherited(symbol, allow))) {
      continue
    }
    const required = !(symbol.flags & typescript.SymbolFlags.Optional)
    const type = checker.getTypeOfSymbolAtLocation(symbol, component)
    // Optional members print with the `| undefined` strict mode adds; the table says optional already.
    const printed = required ? print(type) : print(type).replace(/ \| undefined$/, '')
    const description = typescript.displayPartsToString(symbol.getDocumentationComment(checker)) || undefined
    const member = { name: symbol.name, ...description ? { description } : {}, tags }

    const signature = checker.getNonNullableType(type).getCallSignatures()[0]
    if (EVENT_NAME.test(symbol.name) && signature) {
      const payload = signature.getParameters().map(parameter => `${parameter.name}: ${print(checker.getTypeOfSymbol(parameter))}`).join(', ')
      doc.events.push({ ...member, ...payload ? { type: payload } : {} } satisfies DocEvent)
      continue
    }
    if (symbol.name === 'children' || dialect.slotType.test(printed)) {
      doc.slots.push({ ...member, type: printed } satisfies DocSlot)
      continue
    }

    const code = defaults.get(symbol.name)
    const defaultTag = tags.find(tag => DEFAULT_TAGS.includes(tag.name))?.text
    doc.props.push({
      ...member,
      type: printed,
      required,
      ...code !== undefined ? { default: code } : {},
      ...defaultTag !== undefined ? { defaultTag } : {},
      // The code's default is what runs, so it is the one shown; the flag is for the reader.
      ...code !== undefined && defaultTag !== undefined && normalizeDefault(code) !== normalizeDefault(defaultTag)
        ? { defaultConflict: true }
        : {},
    } satisfies DocProp)
  }
  return doc
}
