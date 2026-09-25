import type { Variant } from '@poveste/shared'
import { createContext } from '../context.js'

export interface PreviewRenderContext {
  mode: 'mount' | 'render'
  slotName: string
  currentVariant: Variant | null
  /**
   * In a sandbox realm: the one variant this realm exists to serve, so the
   * mount pass can skip every other variant's component (#197). Null in the
   * app realm, where the story view needs all of them mounted.
   */
  targetVariantId?: string | null
  externalState: Variant['state'] | null
  nextVariantIndex: {
    value: number
  }
}

/*
 * This one was already a typed symbol with its provide and inject together —
 * it was the pattern the other six were measured against (#981). It goes
 * through the shared helper so the package has one shape rather than two,
 * which is the mistake #978 is about, in miniature.
 */
const renderContext = createContext<PreviewRenderContext>('poveste-preview-render-context', '<Story>')

export function provideRenderContext(value: PreviewRenderContext) {
  renderContext.provide(value)
}

/** Null outside a preview, which several call sites read with `?.`. */
export function useRenderContext() {
  return renderContext.injectOptional()
}
