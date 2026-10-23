import type { DocSlot } from '@poveste/shared'
import type ts from 'typescript'
import type { SlotMeta } from 'vue-component-meta'

/*
 * vue-component-meta gives a slot's props as one type string, `{ open: boolean; close:
 * () => void; }`, with the JSDoc on each of them lost inside it, and reka-ui writes its
 * slot documentation there and nowhere else (#1436). The slot's type object resolves
 * through the same program, one property each.
 */
type DocSlotProp = NonNullable<DocSlot['props']>[number]

export function readSlotProps(typescript: typeof ts, program: ts.Program | undefined, slot: SlotMeta): DocSlotProp[] {
  if (!program) {
    return []
  }
  const checker = program.getTypeChecker()
  let type: ts.Type
  try {
    type = slot.getTypeObject()
  }
  catch {
    return []
  }
  return type.getProperties().map((property) => {
    const description = typescript.displayPartsToString(property.getDocumentationComment(checker))
    return {
      name: property.name,
      type: checker.typeToString(checker.getTypeOfSymbol(property)),
      ...description ? { description } : {},
    }
  })
}
