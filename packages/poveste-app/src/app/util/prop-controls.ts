import type { AutoPropComponentDefinition, AutoPropControl, AutoPropOption, AutoPropOverride, AutoPropsOverrides, ComponentDoc, DocControl, PropDefinition } from '@poveste/shared'
import type { ComponentDocsEntry } from './component-docs'

export interface PropControl {
  kind: AutoPropControl
  options?: { label: string, value: string | number | boolean }[]
  min?: number
  max?: number
  step?: number
  /** The story's override, the prop's type, or what the component carries at runtime. */
  from: 'story' | 'type' | 'runtime'
}

/**
 * The docs of the component a definition was read from (#160). By its file when the
 * plugin knows it; otherwise by its name, only when no other documented component and
 * no other rendered one has it, since another component's types would pick the wrong
 * controls, which is worse than none.
 */
export function docOf(definition: AutoPropComponentDefinition, entries: ComponentDocsEntry[] | undefined, rendered: AutoPropComponentDefinition[]): ComponentDoc | undefined {
  if (!entries?.length) {
    return undefined
  }
  if (definition.file) {
    const file = definition.file.replaceAll('\\', '/')
    return entries.find(entry => entry.file === file || file.endsWith(`/${entry.file}`))?.doc
  }
  const named = entries.filter(entry => entry.name === definition.name)
  const sameName = rendered.filter(other => other.name === definition.name && !other.file)
  return named.length === 1 && sameName.length === 1 ? named[0]!.doc : undefined
}

/** The control a prop gets: the story's override, else its type's, else today's runtime one. `undefined` hides it. */
export function controlOf(prop: PropDefinition, doc: ComponentDoc | undefined, overrides: AutoPropsOverrides | undefined): PropControl | undefined {
  const override = overrides?.[prop.name]
  if (override === false) {
    return undefined
  }
  if (override !== undefined) {
    return fromOverride(override)
  }
  const typed = doc?.props.find(candidate => candidate.name === prop.name)?.control
  return typed ? fromType(typed) : fromRuntime(prop)
}

function fromOverride(override: Exclude<AutoPropOverride, false>): PropControl {
  if (typeof override === 'string') {
    return { kind: override, from: 'story' }
  }
  if (override.control === 'select') {
    return { kind: 'select', options: override.options.map(toOption), from: 'story' }
  }
  if (override.control === 'slider') {
    return { kind: 'slider', min: override.min, max: override.max, ...override.step !== undefined ? { step: override.step } : {}, from: 'story' }
  }
  return { kind: override.control, from: 'story' }
}

function fromType(control: DocControl): PropControl {
  if (control.kind === 'select') {
    return { kind: 'select', options: control.options.map(toOption), from: 'type' }
  }
  return { kind: control.kind === 'boolean' ? 'checkbox' : control.kind, from: 'type' }
}

function fromRuntime(prop: PropDefinition): PropControl {
  switch (prop.types?.[0]) {
    case 'string':
      return { kind: 'text', from: 'runtime' }
    case 'number':
      return { kind: 'number', from: 'runtime' }
    case 'boolean':
      return { kind: 'checkbox', from: 'runtime' }
    default:
      return { kind: 'json', from: 'runtime' }
  }
}

function toOption(option: AutoPropOption): { label: string, value: string | number | boolean } {
  return typeof option === 'object' ? option : { label: String(option), value: option }
}
