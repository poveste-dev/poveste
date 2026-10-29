import type { Variant } from '@poveste/shared'
import type { ReactElement, ReactNode } from 'react'
import type { ReactRenderApi } from '../types.js'
import { clone } from '@poveste/shared'
import { toRaw as _toRaw } from '@poveste/vendors/vue'
import { createElement, Fragment, isValidElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

type Render = (api: ReactRenderApi<any>) => ReactNode

/** Past this, a tag's props go one per line. */
const WIDTH = 80

const MEMO = Symbol.for('react.memo')
const FORWARD_REF = Symbol.for('react.forward_ref')
const LAZY = Symbol.for('react.lazy')

/**
 * The variant's `render`, called with its current state and printed as JSX. A React
 * element keeps its type and props, so the tree is the code, with each value as it
 * is now rather than the expression that made it: `count={3}`, not `count={state.count}`.
 */
export function generateSourceCode(variant: Variant): string | undefined {
  const render = variant.slots?.().default as Render | undefined
  if (typeof render !== 'function') {
    return undefined
  }
  try {
    const node = capture(render, { state: clone(_toRaw(variant.state) ?? {}), setState: () => {} })
    return printNode(node) || undefined
  }
  catch {
    // The preview says what went wrong; the panel shows the story file.
    return undefined
  }
}

/**
 * What `render` returns, called inside a component: `render` is a component body,
 * so it may call hooks (#371), which throw anywhere else. Nothing it returns is
 * rendered.
 */
function capture(render: Render, api: ReactRenderApi<any>): ReactNode {
  let node: ReactNode
  let failed: { error: unknown } | undefined
  function Capture() {
    node = render(api)
    return null
  }
  const root = createRoot(document.createElement('div'), {
    onUncaughtError: (error) => {
      failed = { error }
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
    return ['<>', ...children.flatMap(child => indent(printChild(child))), '</>'].join('\n')
  }
  return children.length ? printChild(children[0]!) : ''
}

/** Fragments opened, empty values dropped, adjacent text joined: what a reader sees as the children. */
function flatten(node: ReactNode): (ReactElement | string)[] {
  const out: (ReactElement | string)[] = []
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
    }
  }
  visit(node)
  return out
}

function printChild(child: ReactElement | string): string {
  return typeof child === 'string' ? printText(child) : printElement(child)
}

function printText(text: string): string {
  return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text
}

function printElement(element: ReactElement): string {
  const name = nameOf(element.type)
  const { children, ...props } = (element.props ?? {}) as Record<string, unknown> & { children?: ReactNode }
  const attributes = Object.entries(props).map(([key, value]) => printProp(key, value)).filter((line): line is string => line !== undefined)
  const inner = flatten(children)

  const oneLine = `<${[name, ...attributes].join(' ')}`
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
  const head = open.length > 1 ? [...open, '>'] : [`${oneLine}>`]
  return [...head, ...inner.flatMap(child => indent(printChild(child))), close].join('\n')
}

function printProp(key: string, value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === true) {
    return key
  }
  if (typeof value === 'string') {
    return value.includes('"') || value.includes('\n') ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`
  }
  // A handler's body is the story's business, not the component's API.
  if (typeof value === 'function') {
    return `${key}={…}`
  }
  if (isValidElement(value)) {
    return `${key}={${printElement(value).replace(/\n\s*/g, ' ')}}`
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
  if (typeof value !== 'object' || value === undefined || seen.has(value)) {
    return value === undefined ? 'undefined' : '…'
  }
  seen.add(value)
  if (Array.isArray(value)) {
    return `[${value.map(item => printValue(item, seen)).join(', ')}]`
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    return '…'
  }
  const entries = Object.entries(value).map(([key, item]) => `${/^[a-z_$][\w$]*$/i.test(key) ? key : JSON.stringify(key)}: ${printValue(item, seen)}`)
  return entries.length ? `{ ${entries.join(', ')} }` : '{}'
}

function nameOf(type: unknown): string {
  if (typeof type === 'string') {
    return type
  }
  if (typeof type === 'function') {
    return (type as { displayName?: string }).displayName || type.name || 'Component'
  }
  const wrapped = type as { $$typeof?: symbol, displayName?: string, type?: unknown, render?: { displayName?: string, name?: string } } | null
  if (wrapped?.displayName) {
    return wrapped.displayName
  }
  if (wrapped?.$$typeof === MEMO) {
    return nameOf(wrapped.type)
  }
  if (wrapped?.$$typeof === FORWARD_REF) {
    return wrapped.render?.displayName || wrapped.render?.name || 'Component'
  }
  if (wrapped?.$$typeof === LAZY) {
    return 'Lazy'
  }
  return 'Component'
}

function indent(text: string): string[] {
  return text.split('\n').map(line => `  ${line}`)
}
