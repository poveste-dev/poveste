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
// Not only at the top: a `generic` setup, or a `<script>` block beside `<script setup>`,
// puts the setup, and the alias with it, inside the component's initializer.
function findEmitAlias(typescript: typeof ts, node: ts.Node): ts.TypeAliasDeclaration | undefined {
  if (typescript.isTypeAliasDeclaration(node) && node.name.text === '__VLS_Emit') {
    return node
  }
  return typescript.forEachChild(node, child => findEmitAlias(typescript, child))
}

export function readEventDocs(typescript: typeof ts, program: ts.Program | undefined, file: string): Map<string, EventDoc> {
  const docs = new Map<string, EventDoc>()
  const source = program?.getSourceFile(file)
  const alias = source && findEmitAlias(typescript, source)
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
