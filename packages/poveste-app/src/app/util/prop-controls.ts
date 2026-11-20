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
  const file = definition.file?.replaceAll('\\', '/')
  if (file?.includes('/')) {
    return entries.find(entry => entry.file === file || file.endsWith(`/${entry.file}`))?.doc
  }
  // A built Vue book sets `__file` to the base name only, which two folders can share.
  const key = (entry: ComponentDocsEntry) => file ? entry.file.split('/').pop() : entry.name
  const matching = entries.filter(entry => key(entry) === (file ?? definition.name))
  const alike = rendered.filter(other => file ? other.file === definition.file : other.name === definition.name && !other.file)
  return matching.length === 1 && alike.length === 1 ? matching[0]!.doc : undefined
}

/** The control a prop gets: the story's override, else its type's, else today's runtime one. `undefined` hides it. */
export function controlOf(prop: PropDefinition, doc: ComponentDoc | undefined, overrides: AutoPropsOverrides | undefined): PropControl | undefined {
  const override = overrides?.[prop.name]
  if (override === false) {
    return undefined
  }
  if (override !== undefined) {
    const problem = problemWith(override)
    if (!problem) {
      return fromOverride(override)
    }
    warnOnce(prop.name, override, problem)
  }
  const typed = doc?.props.find(candidate => candidate.name === prop.name)?.control
  return typed ? fromType(typed) : fromRuntime(prop)
}

/**
 * The default a control with no placeholder shows as its value while the reader has set
 * nothing, which is what the preview renders (#1698). `undefined` for one it cannot hold.
 */
export function defaultShown(control: PropControl, value: unknown): unknown {
  switch (control.kind) {
    case 'checkbox':
      return typeof value === 'boolean' ? value : undefined
    case 'select':
      return control.options?.some(option => option.value === value) ? value : undefined
    case 'slider':
      return typeof value === 'number' ? value : undefined
    default:
      return undefined
  }
}

const SHORTHANDS: AutoPropControl[] = ['text', 'textarea', 'number', 'checkbox', 'json', 'color', 'date']

// The type refuses these, but nothing type-checks a story before it runs, and the panel
// drew a bare slider with no range at the browser's midpoint (#1704).
function problemWith(override: Exclude<AutoPropOverride, false>): string | undefined {
  const value: { control?: unknown, min?: unknown, max?: unknown, options?: unknown } = typeof override === 'object' && override ? override : { control: override }
  if (value.control === 'slider') {
    return typeof value.min === 'number' && typeof value.max === 'number' ? undefined : 'a slider needs its range, as { control: \'slider\', min, max }'
  }
  if (value.control === 'select') {
    return Array.isArray(value.options) ? undefined : 'a select needs its options, as { control: \'select\', options: [...] }'
  }
  return SHORTHANDS.includes(value.control as AutoPropControl) ? undefined : `'${String(value.control)}' names no control; the names are ${SHORTHANDS.map(name => `'${name}'`).join(', ')}`
}

const warned = new Set<string>()

// The panel asks on every render, so the same mistake is reported once.
function warnOnce(name: string, override: unknown, problem: string) {
  const key = `${name}:${JSON.stringify(override)}`
  if (!warned.has(key)) {
    warned.add(key)
    console.warn(`[poveste] autoProps.${name}: ${problem}. The prop keeps the control it would have without the override.`)
  }
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
