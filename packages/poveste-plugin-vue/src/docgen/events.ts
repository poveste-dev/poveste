import type ts from 'typescript'

export interface EventDoc {
  description: string
  tags: { name: string, text?: string }[]
}

/*
 * vue-component-meta reads an event's JSDoc off the component's `$emit` signatures,
 * and those are Vue's own `EmitFn` in `runtime-core.d.ts`, built from the declared
 * type: the comment is never on them, so every event came back without a
 * description or a tag (#1462). Volar keeps the `defineEmits` type argument, comments
 * and all, as a `__VLS_Emit` alias in the generated code, and this reads it there,
 * through the same program, so an emits type imported from another file resolves too.
 */
export function readEventDocs(typescript: typeof ts, program: ts.Program | undefined, file: string): Map<string, EventDoc> {
  const docs = new Map<string, EventDoc>()
  const source = program?.getSourceFile(file)
  const alias = source?.statements.find((statement): statement is ts.TypeAliasDeclaration =>
    typescript.isTypeAliasDeclaration(statement) && statement.name.text === '__VLS_Emit')
  if (!program || !alias) {
    return docs
  }

  const checker = program.getTypeChecker()
  const type = checker.getTypeAtLocation(alias.name)
  const tagsOf = (tags: ts.JSDocTagInfo[]) => tags.map(({ name, text }) => text?.length ? { name, text: typescript.displayPartsToString(text) } : { name })

  // `change: [value: string]`
  for (const property of type.getProperties()) {
    docs.set(property.name, {
      description: typescript.displayPartsToString(property.getDocumentationComment(checker)),
      tags: tagsOf(property.getJsDocTags(checker)),
    })
  }
  // `(event: 'change', value: string): void`
  for (const signature of type.getCallSignatures()) {
    const event = signature.parameters[0] && checker.getTypeOfSymbol(signature.parameters[0])
    if (event?.isStringLiteral()) {
      docs.set(event.value, {
        description: typescript.displayPartsToString(signature.getDocumentationComment(checker)),
        tags: tagsOf(signature.getJsDocTags()),
      })
    }
  }
  return docs
}
