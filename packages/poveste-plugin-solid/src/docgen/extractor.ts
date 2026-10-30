import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type { JsxDialect } from 'poveste/docgen'
import { bundledTypescript, createJsxExtractor } from 'poveste/docgen'

export const SOLID_DIALECT: JsxDialect = {
  jsxImportSource: 'solid-js',
  // `mergeDefaultProps` is Kobalte's, which most Solid design systems build on.
  defaultCalls: ['mergeProps', 'mergeDefaultProps'],
  slotType: /\bJSX\.Element\b/,
  childrenTypes: ['ParentProps', 'FlowProps'],
}

/** Runs in the docgen worker, never in the book, reading it with Poveste's TypeScript 6 (#1464). */
export function createExtractor(context: DocgenExtractorContext): DocgenExtractor {
  return createJsxExtractor(context, SOLID_DIALECT, bundledTypescript())
}
