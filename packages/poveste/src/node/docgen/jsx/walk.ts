import type { ComponentDoc } from '@poveste/shared'
import type ts from 'typescript'
import type { DocgenOptions } from '../typed.js'
import { documentProps } from '../typed.js'

/** What differs between JSX frameworks, as data, so Solid and React share one walker (#1110, #1161). */
export interface JsxDialect {
  /** Where the compiler finds the JSX types when the book has no tsconfig: `solid-js`, `react`. */
  jsxImportSource: string
  /** Calls that merge an object of defaults into the props parameter: `mergeProps`. */
  defaultCalls: string[]
  /** A prop whose printed type matches is a slot: `JSX.Element`. */
  slotType: RegExp
  /** The framework's types that give a component `children`: `ParentProps`, `PropsWithChildren`. */
  childrenTypes: string[]
}

/**
 * The component a story file's default export names in its `component` field,
 * documented from the type of its first parameter. Nothing when the story names none,
 * or names one `exclude` leaves out.
 */
export function documentStory(typescript: typeof ts, program: ts.Program, file: string, dialect: JsxDialect, options: DocgenOptions = {}): ComponentDoc | undefined {
  const sourceFile = program.getSourceFile(file)
  if (!sourceFile) {
    throw new Error('TypeScript did not read the story file')
  }
  const checker = program.getTypeChecker()
  const component = componentField(typescript, checker, sourceFile)
  if (!component) {
    return undefined
  }
  const declaredIn = resolve(typescript, checker, component)?.getDeclarations()?.[0]?.getSourceFile().fileName
  if (declaredIn && options.exclude?.some(pattern => declaredIn.includes(pattern))) {
    return undefined
  }
  const type = checker.getTypeAtLocation(component)
  const props = propsType(typescript, checker, type)
  if (!props) {
    throw new Error(`\`${nameOf(typescript, component) ?? 'the component'}\` has no props type to read`)
  }
  const name = nameOf(typescript, component)
  return documentProps(typescript, checker, props, {
    location: component,
    ...name ? { name } : {},
    defaults: codeDefaults(typescript, checker, component, dialect),
    slotType: dialect.slotType,
    childrenFrom: dialect.childrenTypes,
  }, options)
}

/** `Button`, `Tabs.Root`, or the component inside `memo(Button)`; nothing for an inline function. */
function nameOf(typescript: typeof ts, node: ts.Expression): string | undefined {
  if (typescript.isIdentifier(node) || typescript.isPropertyAccessExpression(node)) {
    return node.getText()
  }
  if (typescript.isCallExpression(node)) {
    for (const argument of node.arguments) {
      const name = nameOf(typescript, argument)
      if (name) {
        return name
      }
    }
  }
  return undefined
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

function propsType(typescript: typeof ts, checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined {
  for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
    const parameter = signature.getParameters()[0]
    if (parameter) {
      const props = checker.getTypeOfSymbol(parameter)
      if (!(props.flags & (typescript.TypeFlags.Any | typescript.TypeFlags.Unknown))) {
        return props
      }
    }
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
