import type { ComponentDoc } from '@poveste/shared'
import { componentDocs as data } from 'virtual:$poveste-component-docs'

// What `poveste build` extracted: a small map from each story to its components, each
// in a chunk of its own, so a reader downloads only the tables of the stories they open (#1429).
export const componentDocs: Record<string, Record<string, () => Promise<{ default: { doc: ComponentDoc } }>>> = data
