import type { DocgenExtractor, DocgenExtractorContext } from '@poveste/shared'
import type { JsxDialect } from 'poveste/docgen'
import { bundledTypescript, createJsxExtractor } from 'poveste/docgen'

export const REACT_DIALECT: JsxDialect = {
  jsxImportSource: 'react',
  // React merges no defaults by call: they are destructuring defaults, which the walker reads anyway.
  defaultCalls: [],
  slotType: /\b(?:ReactNode|ReactElement|JSX\.Element)\b/,
  childrenTypes: ['PropsWithChildren'],
}

/** Runs in the docgen worker, never in the book, reading it with Poveste's TypeScript 6 (#1464). */
export function createExtractor(context: DocgenExtractorContext): DocgenExtractor {
  return createJsxExtractor(context, REACT_DIALECT, bundledTypescript())
}
