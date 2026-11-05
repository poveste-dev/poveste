// Internal to Poveste's React and Solid plugins, not public API (#1524).

/** What a framework's JSX has to look like for {@link createJsxPrinter} to print it. */
export interface JsxElement {
  type: unknown
  props?: Record<string, unknown> | null
  key?: unknown
}

/** How one framework's elements are told apart and named. */
export interface JsxPrinterOptions {
  isElement: (value: unknown) => value is JsxElement
  isFragment: (element: JsxElement) => boolean
  nameOf: (type: unknown) => string | undefined
}

/** Thrown for a component with no name that can be written as a tag. */
export class UnnamedJsxComponent extends Error {}

/** Past this, a tag's props go one per line. */
const WIDTH = 80

const EDGE_SPACE = /^\s|\s$/
// JSX decodes these in text and in a quoted attribute.
const ENTITY = /&(?:#\w+|\w+);/
// What JSX reads as a component. `_c4` would pass, but it's what React Refresh calls a
// component it registers, not a name the reader wrote.
const COMPONENT_NAME = /^(?!_c\d*$)[A-Z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/
// A child JSX can hold but this can't print: a function, a portal, a plain object.
const OPAQUE = Symbol('opaque')

type Child = JsxElement | string | typeof OPAQUE

/**
 * Prints an element tree as JSX, with each value as it is now. A tag has to render, so
 * a component with no name JSX can read throws {@link UnnamedJsxComponent}. A value is
 * different: a function or a class instance prints as `…`, for the reader to fill in.
 */
export function createJsxPrinter({ isElement, isFragment, nameOf }: JsxPrinterOptions): (node: unknown) => string {
  function printNode(node: unknown): string {
    const children = flatten(node)
    if (children.length > 1) {
      const inline = inlineChildren(children)
      if (inline !== undefined && inline.length + 5 <= WIDTH) {
        return `<>${inline}</>`
      }
      return ['<>', ...children.flatMap(child => indent(printLine(child))), '</>'].join('\n')
    }
    return children[0] === undefined || children[0] === OPAQUE ? '' : printChild(children[0])
  }

  /** Fragments opened, empty values dropped, adjacent text joined: what a reader sees as the children. */
  function flatten(node: unknown): Child[] {
    const out: Child[] = []
    const visit = (value: unknown) => {
      if (value === null || value === undefined || typeof value === 'boolean') {
        return
      }
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      if (isElement(value) && isFragment(value)) {
        visit(value.props?.['children'])
        return
      }
      if (isElement(value)) {
        out.push(value)
        return
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
        const last = out.at(-1)
        if (typeof last === 'string') {
          out[out.length - 1] = last + String(value)
        }
        else {
          out.push(String(value))
        }
        return
      }
      if (typeof value === 'function' || typeof value === 'object') {
        out.push(OPAQUE)
      }
    }
    visit(node)
    return out
  }

  function printChild(child: Child, flat = false): string {
    if (child === OPAQUE) {
      return '{…}'
    }
    return typeof child === 'string' ? printText(child) : printElement(child, flat)
  }

  /** A child on a line of its own, where JSX would trim the text's edges. */
  function printLine(child: Child): string {
    return typeof child === 'string' && EDGE_SPACE.test(child) ? `{${JSON.stringify(child)}}` : printChild(child)
  }

  /** Children whose text has spaces at its edges, together on one line, where JSX keeps them as written. */
  function inlineChildren(children: Child[]): string | undefined {
    if (!children.some(child => typeof child === 'string' && EDGE_SPACE.test(child))) {
      return undefined
    }
    const printed = children.map(child => printChild(child)).join('')
    return printed.includes('\n') ? undefined : printed
  }

  function printText(text: string): string {
    return /[{}<>\n]/.test(text) || ENTITY.test(text) ? `{${JSON.stringify(text)}}` : text
  }

  /** `flat` is for a place that holds one line, where a line break between children would become a space. */
  function printElement(element: JsxElement, flat = false): string {
    const name = nameOf(element.type)
    if (!name || (typeof element.type !== 'string' && !COMPONENT_NAME.test(name))) {
      throw new UnnamedJsxComponent()
    }
    const { children, ...props } = element.props ?? {}
    const attributes = [...element.key === null || element.key === undefined ? [] : [printProp('key', element.key)], ...Object.entries(props).map(([key, value]) => printProp(key, value))].filter((line): line is string => line !== undefined)
    const inner = flatten(children)

    const oneLine = `<${[name, ...attributes].join(' ')}`
    if (flat) {
      const body = inner.map(child => printChild(child, true)).join('')
      return inner.length ? `${oneLine}>${body}</${name}>` : `${oneLine} />`
    }
    const open = oneLine.length + 2 > WIDTH && attributes.length > 1
      ? [`<${name}`, ...attributes.map(line => `  ${line}`)]
      : [oneLine]
    if (!inner.length) {
      return open.length > 1 ? [...open, '/>'].join('\n') : `${oneLine} />`
    }
    const close = `</${name}>`
    if (open.length === 1 && inner.length === 1 && typeof inner[0] === 'string') {
      const line = `${oneLine}>${printText(inner[0])}${close}`
      if (line.length <= WIDTH && !inner[0].includes('\n')) {
        return line
      }
    }
    const inline = open.length === 1 ? inlineChildren(inner) : undefined
    if (inline !== undefined && oneLine.length + inline.length + close.length + 1 <= WIDTH) {
      return `${oneLine}>${inline}${close}`
    }
    const head = open.length > 1 ? [...open, '>'] : [`${oneLine}>`]
    return [...head, ...inner.flatMap(child => indent(printLine(child))), close].join('\n')
  }

  function printProp(key: string, value: unknown): string | undefined {
    if (value === undefined) {
      return undefined
    }
    if (value === true) {
      return key
    }
    if (typeof value === 'string') {
      return value.includes('"') || value.includes('\n') || ENTITY.test(value) ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`
    }
    // A handler's body is the story's business, not the component's API.
    if (typeof value === 'function') {
      return `${key}={…}`
    }
    if (isElement(value)) {
      return `${key}={${printElement(value, true)}}`
    }
    return `${key}={${printValue(value, new Set())}}`
  }

  function printValue(value: unknown, seen: Set<unknown>): string {
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (typeof value === 'bigint') {
      return `${value}n`
    }
    if (typeof value === 'string') {
      return JSON.stringify(value)
    }
    if (typeof value === 'function' || isElement(value)) {
      return '…'
    }
    // By tag: a `Date` from another window isn't an instance of this one's.
    if (Object.prototype.toString.call(value) === '[object Date]') {
      const date = value as Date
      return Number.isNaN(date.getTime()) ? 'new Date(NaN)' : `new Date(${JSON.stringify(date.toISOString())})`
    }
    if (typeof value !== 'object' || value === undefined || seen.has(value)) {
      return value === undefined ? 'undefined' : '…'
    }
    const native = nativeKind(value)
    if (native === 'RegExp') {
      return String(value)
    }
    if (!native && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      return '…'
    }
    // Only for its own contents: a value that appears twice isn't a cycle.
    seen.add(value)
    const printed = printContainer(value, seen)
    seen.delete(value)
    return printed
  }

  // By tag, as a `Date` is. The name rules out a subclass, which has the tag and a
  // constructor of its own, and an object that only claims the tag.
  function nativeKind(value: object): 'Map' | 'Set' | 'RegExp' | undefined {
    const kind = Object.prototype.toString.call(value).slice(8, -1)
    return (kind === 'Map' || kind === 'Set' || kind === 'RegExp') && value.constructor?.name === kind ? kind : undefined
  }

  function printContainer(value: object, seen: Set<unknown>): string {
    if (Array.isArray(value)) {
      return `[${value.map(item => printValue(item, seen)).join(', ')}]`
    }
    const native = nativeKind(value)
    if (native) {
      const items = native === 'Map'
        ? [...value as Map<unknown, unknown>].map(([key, item]) => `[${printValue(key, seen)}, ${printValue(item, seen)}]`)
        : [...value as Set<unknown>].map(item => printValue(item, seen))
      return items.length ? `new ${native}([${items.join(', ')}])` : `new ${native}()`
    }
    const entries = Object.entries(value).map(([key, item]) => `${/^[a-z_$][\w$]*$/i.test(key) ? key : JSON.stringify(key)}: ${printValue(item, seen)}`)
    return entries.length ? `{ ${entries.join(', ')} }` : '{}'
  }

  return printNode
}

function indent(text: string): string[] {
  return text.split('\n').map(line => `  ${line}`)
}
