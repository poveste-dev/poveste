import { join } from 'pathe'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { controlFor } from '../docgen/control.js'

const fixture = join(import.meta.dirname, 'docgen-control/props.ts')

function controlOf(name: string) {
  const program = ts.createProgram([fixture], { strict: true, target: ts.ScriptTarget.ESNext, lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'], noEmit: true })
  const checker = program.getTypeChecker()
  const props = program.getSourceFile(fixture)!.statements.find(ts.isInterfaceDeclaration)!
  const symbol = checker.getPropertyOfType(checker.getTypeAtLocation(props), name)!
  return controlFor(ts, checker, checker.getTypeOfSymbolAtLocation(symbol, props))
}

describe('the control a prop\'s type picks', () => {
  it.each([
    ['label', { kind: 'text' }],
    ['count', { kind: 'number' }],
    ['open', { kind: 'boolean' }],
    ['width', { kind: 'text' }],
  ])('gives %s a plain control', (name, control) => {
    expect(controlOf(name)).toEqual(control)
  })

  it.each([
    ['size', ['s', 'm', 'l']],
    ['inline', ['a', 'b']],
    ['icon', ['like', 'loader']],
    ['tone', ['info', 'warn']],
    ['level', [1, 2, 3]],
    ['maybe', ['x']],
  ])('gives %s a select of its literals, through any alias', (name, options) => {
    expect(controlOf(name)).toEqual({ kind: 'select', options })
  })

  it.each(['items', 'pair', 'options'])('gives %s, an array or plain object, the JSON editor', (name) => {
    expect(controlOf(name)).toEqual({ kind: 'json' })
  })

  it.each(['mixed', 'sizeOrFlag', 'onClick', 'when', 'anything'])('gives %s no control of its own', (name) => {
    expect(controlOf(name)).toBeUndefined()
  })
})
