import type { ClientSupportPlugin, Variant } from '@poveste/shared'
import type { ReactElement, ReactNode } from 'react'
import type { ReactRenderApi } from '../types.js'
import { clone } from '@poveste/shared'
import { toRaw as _toRaw } from '@poveste/vendors/vue'
import { createElement, Fragment, isValidElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

type Render = (api: ReactRenderApi<any>) => ReactNode
type GeneratedSource = ReturnType<ClientSupportPlugin['generateSourceCode']>

/** Past this, a tag's props go one per line. */
const WIDTH = 80

const EDGE_SPACE = /^\s|\s$/
// JSX decodes these in text and in a quoted attribute.
const ENTITY = /&(?:#\w+|\w+);/

const MEMO = Symbol.for('react.memo')
const FORWARD_REF = Symbol.for('react.forward_ref')
const BUILT_INS: Record<symbol, string> = {
  [Symbol.for('react.suspense')]: 'Suspense',
  [Symbol.for('react.strict_mode')]: 'StrictMode',
  [Symbol.for('react.profiler')]: 'Profiler',
  [Symbol.for('react.activity')]: 'Activity',
}
// What JSX reads as a component. `_c4` would pass, but it's what React Refresh calls a
// component it registers, not a name the reader wrote.
const COMPONENT_NAME = /^(?!_c\d*$)[A-Z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/

// Thrown to abandon the render that called the variant's `render`.
const CAPTURED = Symbol('captured')
// A child JSX can hold but this can't print: a function, a portal, a plain object.
const OPAQUE = Symbol('opaque')

type Child = ReactElement | string | typeof OPAQUE

class UnnamedComponent extends Error {}

/**
 * The variant's `render`, called with its current state and printed as JSX. A React
 * element keeps its type and props, so the tree is the code, with each value as it
 * is now rather than the expression that made it: `count={3}`, not `count={state.count}`.
 *
 * A tag has to render, and a binding isn't in the element, so a component with no name
 * JSX can read, such as `memo(() => …)` or a context with no `displayName`, leaves the
 * panel on the story file, saying why (#1569). A value is different: a function or a
 * class instance prints as `…`, for the reader to fill in.
 */
export function generateSourceCode(variant: Variant): GeneratedSource {
  const render = variant.slots?.().default as Render | undefined
  if (typeof render !== 'function') {
    return undefined
  }
  let node: ReactNode
  try {
    node = capture(render, { state: clone(_toRaw(variant.state) ?? {}), setState: () => {} })
  }
  catch {
    // The preview says what went wrong; the panel shows the story file.
    return undefined
  }
  try {
    return printNode(node) || undefined
  }
  catch (error) {
    if (error instanceof UnnamedComponent) {
      return { unavailable: 'This variant has a component with no name to print. Give it one to see its source here.' }
    }
    // The preview rendered this, so nothing else will say.
    console.error(error)
    return undefined
  }
}

/**
 * What `render` returns, called inside a component: `render` is a component body,
 * so it may call hooks (#371), which throw anywhere else. The render is abandoned
 * once `render` returns, so nothing commits and the story's effects don't run.
 */
function capture(render: Render, api: ReactRenderApi<any>): ReactNode {
  let node: ReactNode
  let failed: { error: unknown } | undefined
  function Capture(): null {
    node = render(api)
    throw CAPTURED
  }
  const root = createRoot(document.createElement('div'), {
    onUncaughtError: (error) => {
      if (error !== CAPTURED) {
        failed = { error }
      }
    },
  })
  flushSync(() => root.render(createElement(Capture)))
  root.unmount()
  if (failed) {
    throw failed.error
  }
  return node
}

export function printNode(node: ReactNode): string {
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
function flatten(node: ReactNode): Child[] {
  const out: Child[] = []
  const visit = (value: ReactNode) => {
    if (value === null || value === undefined || typeof value === 'boolean') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (isValidElement(value) && value.type === Fragment) {
      visit((value.props as { children?: ReactNode }).children)
      return
    }
    if (isValidElement(value)) {
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
function printElement(element: ReactElement, flat = false): string {
  const name = nameOf(element.type)
  if (!name || (typeof element.type !== 'string' && !COMPONENT_NAME.test(name))) {
    throw new UnnamedComponent()
  }
  const { children, ...props } = (element.props ?? {}) as Record<string, unknown> & { children?: ReactNode }
  const attributes = [...element.key === null ? [] : [printProp('key', element.key)], ...Object.entries(props).map(([key, value]) => printProp(key, value))].filter((line): line is string => line !== undefined)
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
  if (isValidElement(value)) {
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
  if (typeof value === 'function' || isValidElement(value)) {
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

function nameOf(type: unknown): string | undefined {
  if (typeof type === 'string') {
    return type
  }
  if (typeof type === 'symbol') {
    return BUILT_INS[type]
  }
  if (typeof type === 'function') {
    return (type as { displayName?: string }).displayName || type.name
  }
  const wrapped = type as { $$typeof?: symbol, displayName?: string, type?: unknown, render?: { displayName?: string, name?: string } } | null
  if (wrapped?.displayName) {
    return wrapped.displayName
  }
  if (wrapped?.$$typeof === MEMO) {
    return nameOf(wrapped.type)
  }
  if (wrapped?.$$typeof === FORWARD_REF) {
    return wrapped.render?.displayName || wrapped.render?.name
  }
  return undefined
}

function indent(text: string): string[] {
  return text.split('\n').map(line => `  ${line}`)
}
