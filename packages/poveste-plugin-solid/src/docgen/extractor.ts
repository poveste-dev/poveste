import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type { JsxDialect } from 'poveste/docgen-jsx'
import { createJsxExtractor } from 'poveste/docgen-jsx'

export const SOLID_DIALECT: JsxDialect = {
  jsxImportSource: 'solid-js',
  componentTypes: ['Component', 'ParentComponent', 'VoidComponent', 'FlowComponent'],
  // `mergeDefaultProps` is Kobalte's, which most Solid design systems build on.
  defaultCalls: ['mergeProps', 'mergeDefaultProps'],
  slotType: /\bJSX\.Element\b/,
}

/** Runs in the docgen worker, never in the book. */
export function createExtractor(context: DocgenExtractorContext): DocgenExtractor {
  return createJsxExtractor(context, SOLID_DIALECT)
}
