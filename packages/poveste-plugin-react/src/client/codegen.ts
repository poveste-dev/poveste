import type { ClientSupportPlugin, Variant } from '@poveste/shared'
import type { JsxElement } from '@poveste/shared/jsx'
import type { ReactNode } from 'react'
import type { ReactRenderApi } from '../types.js'
import { clone } from '@poveste/shared'
import { createJsxPrinter, UnnamedJsxComponent } from '@poveste/shared/jsx'
import { toRaw as _toRaw } from '@poveste/vendors/vue'
import { createElement, Fragment, isValidElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

type Render = (api: ReactRenderApi<any>) => ReactNode
type GeneratedSource = ReturnType<ClientSupportPlugin['generateSourceCode']>

const MEMO = Symbol.for('react.memo')
const FORWARD_REF = Symbol.for('react.forward_ref')
const BUILT_INS: Record<symbol, string> = {
  [Symbol.for('react.suspense')]: 'Suspense',
  [Symbol.for('react.strict_mode')]: 'StrictMode',
  [Symbol.for('react.profiler')]: 'Profiler',
  [Symbol.for('react.activity')]: 'Activity',
}

// Thrown to abandon the render that called the variant's `render`.
const CAPTURED = Symbol('captured')
const printNode = createJsxPrinter({
  isElement: isValidElement as (value: unknown) => value is JsxElement,
  isFragment: element => element.type === Fragment,
  nameOf,
})

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
    if (error instanceof UnnamedJsxComponent) {
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
