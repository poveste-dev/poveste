import type { ClientSupportPlugin, Variant } from '@poveste/shared'
import type { JsxElement } from '@poveste/shared/jsx'
import type { SolidRenderApi } from '../types.js'
import { clone } from '@poveste/shared'
import { createJsxPrinter, UnnamedJsxComponent } from '@poveste/shared/jsx'
import { toRaw as _toRaw } from '@poveste/vendors/vue'
import { createRoot } from 'solid-js'

type GeneratedSource = ReturnType<ClientSupportPlugin['generateSourceCode']>
type CopiedRender = (api: SolidRenderApi<any>) => unknown

const ELEMENT = Symbol.for('poveste.solid.element')
const FRAGMENT = Symbol.for('poveste.solid.fragment')

const printNode = createJsxPrinter({
  isElement: (value): value is JsxElement => typeof value === 'object' && value !== null && ELEMENT in value,
  isFragment: element => element.type === FRAGMENT,
  nameOf,
})

function nameOf(type: unknown): string | undefined {
  if (typeof type === 'string') {
    return type
  }
  if (typeof type !== 'function') {
    return undefined
  }
  // Under `poveste dev`, Solid's hot reload wraps a component and renames it.
  return (type as { displayName?: string }).displayName || type.name.replace(/^\[solid-refresh\]/, '')
}

/**
 * The variant's `render`, from the copy of its story file that `jsx-copy.ts` compiles,
 * called with its current state and printed as JSX. A `render` that returns something
 * other than JSX, such as a `solid-js/html` template, has nothing to print, and the
 * panel shows the story file.
 */
export async function generateSourceCode(variant: Variant): Promise<Awaited<GeneratedSource>> {
  const slots = variant.slots?.() as { jsx?: () => Promise<CopiedRender | undefined> } | undefined
  let node: unknown
  try {
    const render = await slots?.jsx?.()
    if (!render) {
      return undefined
    }
    node = createRoot((dispose) => {
      try {
        return render({ state: clone(_toRaw(variant.state) ?? {}), setState: (() => {}) as SolidRenderApi<any>['setState'] })
      }
      finally {
        dispose()
      }
    })
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
