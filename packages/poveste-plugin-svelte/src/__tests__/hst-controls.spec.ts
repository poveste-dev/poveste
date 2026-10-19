import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { components } from '@poveste/controls'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// `Hst.*` is built at runtime from `@poveste/controls`' components, named by
// dropping their `Hst` prefix (`client/render.ts`). The type is written by hand,
// and it typed `Hst.ColorShades` as `Shades`: the name that works failed
// svelte-check, and the one that typechecked was undefined (#1380).
function typedMembers() {
  const file = join(import.meta.dirname, '..', 'helpers.ts')
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
  const hst = source.statements.find((node): node is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(node) && node.name.text === 'Hst')
  return hst!.members.flatMap(member => member.name && ts.isIdentifier(member.name) ? [member.name.text] : [])
}

describe('the Hst type', () => {
  it('names every control the runtime puts on Hst, by the name it uses', () => {
    const runtime = Object.keys(components).map(key => key.substring(3))

    expect(typedMembers().filter(name => name !== 'Story' && name !== 'Variant').sort()).toEqual(runtime.sort())
  })
})
