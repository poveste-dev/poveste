import type { Variant } from '@poveste/shared'
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

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

const previewRenderContextKey: InjectionKey<PreviewRenderContext> = Symbol('poveste-preview-render-context')

export function provideRenderContext(value: PreviewRenderContext) {
  provide(previewRenderContextKey, value)
}

export function useRenderContext() {
  return inject(previewRenderContextKey, null)
}
